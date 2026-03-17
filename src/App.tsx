import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GameProvider, useGame } from './state/GameContext';
import { getFarmerId, getFarmerIdIfExists, createFarmerId, setFarmerId, sendFriendRequest, ensureProfile } from './firebase/db';
import { LoginScreen } from './components/LoginScreen';
import { useFriends } from './hooks/useFriends';
import { FarmView } from './components/FarmView';
import { ToastContainer, showToast } from './components/Toast';
import { getUnlockCost, getUnlockLevel } from './engine/economy';
import { ANIMALS } from './constants/animals';
import { CROPS } from './constants/crops';
import { HUD } from './components/HUD';
import { Inventory } from './components/Inventory';
import { ShopPanel } from './components/ShopPanel';
import { CropSelector } from './components/CropSelector';
import { WinterSelector } from './components/WinterSelector';
import { CraftingPanel } from './components/CraftingPanel';
import { OrdersPanel } from './components/OrdersPanel';
import { ProfileEditor } from './components/ProfileEditor';
import { SeasonalBackground } from './components/SeasonalBackground';
import { NeighborsPanel } from './components/NeighborsPanel';
import { FriendFarmView } from './components/FriendFarmView';
import { useHarvestEffect, HarvestEffectLayer } from './components/HarvestEffect';
import './App.css';
import './styles/farm.css';

type PanelId = 'shop' | 'crafting' | 'orders' | 'inventory' | 'friends' | null;

function GameContent() {
  const { state, dispatch } = useGame();
  const [searchParams] = useSearchParams();

  // Handle invite link
  useEffect(() => {
    const inviteId = searchParams.get('invite');
    if (inviteId && inviteId !== getFarmerId()) {
      ensureProfile(state).then(() =>
        sendFriendRequest(getFarmerId(), inviteId)
      ).then(ok => {
        if (ok) showToast('📨 Запит на дружбу надіслано!', 'info');
        else showToast('🏘️ Вже друзі або запит вже надіслано', 'info');
        window.history.replaceState({}, '', '/');
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show help log toasts (friends harvested for you)
  useEffect(() => {
    const log = state.helpLog;
    if (log && log.length > 0) {
      // Delay so toasts appear after UI is ready
      setTimeout(() => {
        for (const entry of log) {
          const crop = CROPS[entry.cropId];
          showToast(`🌾 ${entry.helper} зібрав тобі ${crop?.emoji ?? ''} ${crop?.name ?? 'врожай'}!`, 'earn');
        }
        dispatch({ type: 'CLEAR_HELP_LOG' });
      }, 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply season class to body for background
  useEffect(() => {
    document.body.className = `season-${state.season}`;
  }, [state.season]);

  const [cropSelector, setCropSelector] = useState<{
    plotIndex: number;
    position: { x: number; y: number };
  } | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  // Show profile editor if name or password is missing
  useEffect(() => {
    if (!state.profile.name || !state.profile.password) {
      setShowProfile(true);
    }
  }, [state.profile.name, state.profile.password]);
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [visitingFriendId, setVisitingFriendId] = useState<string | null>(null);
  const { pendingRequests } = useFriends();
  const { effects, spawnEffect } = useHarvestEffect();

  // Track last click position for harvest effects
  const lastClickRef = useRef({ clientX: 0, clientY: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      lastClickRef.current = { clientX: e.clientX, clientY: e.clientY };
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  const togglePanel = (id: PanelId) => {
    setActivePanel((prev) => (prev === id ? null : id));
  };

  const handleVisitFriend = useCallback((friendId: string) => {
    setVisitingFriendId(friendId);
    setActivePanel(null);
  }, []);

  const handlePlotClick = useCallback(
    (plotIndex: number) => {
      const plot = state.plots[plotIndex];
      if (!plot) return;

      switch (plot.status) {
        case 'empty':
          setCropSelector({
            plotIndex,
            position: { x: 300, y: 200 },
          });
          break;
        case 'ready': {
          const crop = CROPS[plot.cropId];
          spawnEffect(crop.emoji, lastClickRef.current);
          showToast(`${crop.emoji} ${crop.name} зібрано! +${crop.sellPrice}💰`, 'earn');
          dispatch({ type: 'HARVEST', plotIndex });
          break;
        }
        case 'locked': {
          const cost = getUnlockCost(state.plots, plotIndex);
          const reqLevel = getUnlockLevel(state.plots, plotIndex);
          if (state.level < reqLevel) {
            showToast(`🔒 Потрібен рівень ${reqLevel}`, 'info');
          } else if (state.coins < cost) {
            showToast(`🔒 Потрібно ${cost}💰`, 'info');
          } else {
            showToast(`🔓 Нова ділянка! −${cost}💰`, 'spend');
            dispatch({ type: 'UNLOCK_PLOT', plotIndex });
          }
          break;
        }
        case 'wood_ready': {
          spawnEffect('🪵', lastClickRef.current);
          dispatch({ type: 'COLLECT_WOOD', plotIndex });
          showToast('🪵 Дрова зібрано!', 'earn');
          break;
        }
        case 'growing':
          // Allow changing auto-crop on growing plots
          if (state.hasAutoPlanter) {
            setCropSelector({
              plotIndex,
              position: { x: 300, y: 200 },
            });
          }
          break;
      }
    },
    [state.plots, state.coins, state.level, dispatch, spawnEffect],
  );

  const handleAnimalClick = useCallback(
    (animalIndex: number) => {
      const slot = state.animals[animalIndex];
      if (slot) {
        const animal = ANIMALS[slot.animalId];
        spawnEffect(animal.productEmoji, lastClickRef.current);
        showToast(`${animal.productEmoji} ${animal.productName} зібрано! +${animal.productSellPrice}💰`, 'earn');
      }
      dispatch({ type: 'COLLECT_PRODUCT', animalIndex });
    },
    [dispatch, state.animals, spawnEffect],
  );

  // Badge counts
  const inventoryCount = Object.values(state.inventory).reduce((s, n) => s + (n ?? 0), 0);
  const readyOrders = state.orders.filter((o) => {
    return Object.entries(o.items).every(
      ([itemId, needed]) => (state.inventory[itemId as keyof typeof state.inventory] ?? 0) >= (needed ?? 0)
    );
  }).length;
  const craftReady = state.crafting.filter(
    (slot) => (Date.now() - slot.startedAt) / 1000 >= slot.craftTime
  ).length;


  return (
    <div className={`game-layout-v2 season-${state.season}`}>
      <SeasonalBackground />
      <ToastContainer />
      <HarvestEffectLayer effects={effects} />
      <HUD onProfileClick={() => setShowProfile(true)} />

      <div className="game-center">
        {visitingFriendId ? (
          <FriendFarmView
            friendId={visitingFriendId}
            onBack={() => setVisitingFriendId(null)}
          />
        ) : (
          <FarmView onPlotClick={handlePlotClick} onAnimalClick={handleAnimalClick} />
        )}
      </div>

      {/* Bottom bar */}
      {!visitingFriendId && (
      <div className="bottom-bar">
        <button
          className={`bar-btn ${activePanel === 'shop' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('shop')}
        >
          <span className="bar-btn-icon">🏪</span>
          <span className="bar-btn-label">Ринок</span>
        </button>
        <button
          className={`bar-btn ${activePanel === 'crafting' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('crafting')}
        >
          <span className="bar-btn-icon">🔨</span>
          <span className="bar-btn-label">Крафт</span>
          {craftReady > 0 && <span className="bar-badge">{craftReady}</span>}
        </button>
        <button
          className={`bar-btn ${activePanel === 'orders' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('orders')}
        >
          <span className="bar-btn-icon">📋</span>
          <span className="bar-btn-label">Замовлення</span>
          {readyOrders > 0 && <span className="bar-badge">{readyOrders}</span>}
        </button>
        <button
          className={`bar-btn ${activePanel === 'inventory' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('inventory')}
        >
          <span className="bar-btn-icon">📦</span>
          <span className="bar-btn-label">Інвентар</span>
          {inventoryCount > 0 && <span className="bar-badge">{inventoryCount}</span>}
        </button>
        <button
          className={`bar-btn ${activePanel === 'friends' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('friends')}
        >
          <span className="bar-btn-icon">👥</span>
          <span className="bar-btn-label">Друзі</span>
          {pendingRequests.length > 0 && <span className="bar-badge">{pendingRequests.length}</span>}
        </button>
      </div>
      )}

      {/* Panel popup */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            key="panel-overlay"
            className="panel-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setActivePanel(null)}
          >
            <motion.div
              className="panel-popup"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="panel-popup-close" onClick={() => setActivePanel(null)}>✕</button>
              {activePanel === 'shop' && <ShopPanel />}
              {activePanel === 'crafting' && <CraftingPanel />}
              {activePanel === 'orders' && <OrdersPanel />}
              {activePanel === 'inventory' && <Inventory onClose={() => setActivePanel(null)} />}
              {activePanel === 'friends' && <NeighborsPanel onVisitFriend={handleVisitFriend} />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cropSelector && (
          <motion.div
            key="crop-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {state.season === 'winter' && state.plots[cropSelector.plotIndex]?.status === 'empty' ? (
              <WinterSelector
                plotIndex={cropSelector.plotIndex}
                onClose={() => setCropSelector(null)}
              />
            ) : (
              <CropSelector
                plotIndex={cropSelector.plotIndex}
                position={cropSelector.position}
                onClose={() => setCropSelector(null)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
          <motion.div
            key="profile-overlay"
            className="panel-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={state.profile.password ? () => setShowProfile(false) : undefined}
          >
            <motion.div
              className="panel-popup"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="panel-popup-close" onClick={() => setShowProfile(false)} style={{ display: state.profile.password ? undefined : 'none' }}>✕</button>
              <ProfileEditor onClose={() => setShowProfile(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [hasId, setHasId] = useState(() => !!getFarmerIdIfExists());

  // Detect if farmer ID was removed (e.g. manual localStorage clear) → show LoginScreen
  useEffect(() => {
    const checkId = setInterval(() => {
      if (hasId && !getFarmerIdIfExists()) {
        setHasId(false);
      }
    }, 2000);
    return () => clearInterval(checkId);
  }, [hasId]);

  if (!hasId) {
    return (
      <LoginScreen
        onNewGame={() => {
          // Clear old localStorage save to prevent mixing with new account
          localStorage.removeItem('happyFarmer_save');
          createFarmerId();
          setHasId(true);
        }}
        onLogin={(id) => {
          // Clear old localStorage save to prevent mixing accounts
          localStorage.removeItem('happyFarmer_save');
          setFarmerId(id);
          setHasId(true);
        }}
      />
    );
  }

  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
