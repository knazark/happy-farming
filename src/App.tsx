import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GameProvider, useGame } from './state/GameContext';
import { getFarmerId, getFarmerIdIfExists, createFarmerId, setFarmerId, sendFriendRequest, ensureProfile } from './firebase/db';
import { LoginScreen } from './components/LoginScreen';
import { useFriends } from './hooks/useFriends';
import { useFocusTrap } from './hooks/useFocusTrap';
import { FarmView } from './components/FarmView';
import { ToastContainer, showToast } from './components/Toast';
import { getUnlockCost, getUnlockLevel } from './engine/economy';
import { ANIMALS } from './constants/animals';
import { CROPS } from './constants/crops';
import { HUD } from './components/HUD';
import { WeatherEffects } from './components/WeatherEffects';
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

  // Focus trap refs for modals
  const panelRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const closePanelCb = useCallback(() => setActivePanel(null), []);
  const closeCropCb = useCallback(() => setCropSelector(null), []);
  const closeProfileCb = useCallback(() => setShowProfile(false), []);
  useFocusTrap(panelRef, !!activePanel, closePanelCb);
  useFocusTrap(cropRef, !!cropSelector, closeCropCb);
  useFocusTrap(profileRef, showProfile, closeProfileCb);

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
          const totalItems = Object.values(state.inventory).reduce((s, n) => s + (n ?? 0), 0);
          if (totalItems >= state.storageCapacity) {
            showToast('📦 Інвентар повний! Продайте щось або збільшіть місце', 'info');
            break;
          }
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
          const totalItems2 = Object.values(state.inventory).reduce((s, n) => s + (n ?? 0), 0);
          if (totalItems2 >= state.storageCapacity) {
            showToast('📦 Інвентар повний! Продайте щось або збільшіть місце', 'info');
            break;
          }
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
      if (!slot) return;

      const totalItems = Object.values(state.inventory).reduce((s, n) => s + (n ?? 0), 0);
      if (totalItems >= state.storageCapacity) {
        showToast('📦 Інвентар повний! Продайте щось або збільшіть місце', 'info');
        return;
      }

      const animal = ANIMALS[slot.animalId];
      spawnEffect(animal.productEmoji, lastClickRef.current);
      showToast(`${animal.productEmoji} ${animal.productName} зібрано! +${animal.productSellPrice}💰`, 'earn');
      dispatch({ type: 'COLLECT_PRODUCT', animalIndex });
    },
    [dispatch, state.animals, state.inventory, state.storageCapacity, spawnEffect],
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
      <WeatherEffects />
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
          aria-label="Магазин"
          aria-current={activePanel === 'shop' ? 'page' : undefined}
        >
          <span className="bar-btn-icon" aria-hidden="true">🏪</span>
          <span className="bar-btn-label">Ринок</span>
        </button>
        <button
          className={`bar-btn ${activePanel === 'crafting' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('crafting')}
          aria-label="Крафт"
          aria-current={activePanel === 'crafting' ? 'page' : undefined}
        >
          <span className="bar-btn-icon" aria-hidden="true">🔨</span>
          <span className="bar-btn-label">Крафт</span>
          {craftReady > 0 && <span className="bar-badge">{craftReady}</span>}
        </button>
        <button
          className={`bar-btn ${activePanel === 'orders' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('orders')}
          aria-label="Замовлення"
          aria-current={activePanel === 'orders' ? 'page' : undefined}
        >
          <span className="bar-btn-icon" aria-hidden="true">📋</span>
          <span className="bar-btn-label">Замовлення</span>
          {readyOrders > 0 && <span className="bar-badge">{readyOrders}</span>}
        </button>
        <button
          className={`bar-btn ${activePanel === 'inventory' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('inventory')}
          aria-label="Інвентар"
          aria-current={activePanel === 'inventory' ? 'page' : undefined}
        >
          <span className="bar-btn-icon" aria-hidden="true">📦</span>
          <span className="bar-btn-label">Інвентар</span>
          {inventoryCount > 0 && <span className="bar-badge">{inventoryCount}</span>}
        </button>
        <button
          className={`bar-btn ${activePanel === 'friends' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('friends')}
          aria-label="Друзі"
          aria-current={activePanel === 'friends' ? 'page' : undefined}
        >
          <span className="bar-btn-icon" aria-hidden="true">👥</span>
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
            animate={{ opacity: 1, pointerEvents: 'auto' as const }}
            exit={{ opacity: 0, pointerEvents: 'none' as const }}
            transition={{ duration: 0.15 }}
            onClick={() => setActivePanel(null)}
          >
            <motion.div
              ref={panelRef}
              className="panel-popup"
              role="dialog"
              aria-modal="true"
              aria-label={activePanel === 'shop' ? 'Магазин' : activePanel === 'crafting' ? 'Крафт' : activePanel === 'orders' ? 'Замовлення' : activePanel === 'inventory' ? 'Інвентар' : 'Друзі'}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="panel-popup-close" aria-label="Закрити" onClick={() => setActivePanel(null)}>✕</button>
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
            className="crop-selector-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, pointerEvents: 'auto' as const }}
            exit={{ opacity: 0, pointerEvents: 'none' as const }}
            transition={{ duration: 0.15 }}
            onClick={() => setCropSelector(null)}
          >
            <motion.div
              ref={cropRef}
              className="crop-selector"
              role="dialog"
              aria-modal="true"
              aria-label="Вибір культури"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => e.stopPropagation()}
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
          <motion.div
            key="profile-overlay"
            className="panel-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, pointerEvents: 'auto' as const }}
            exit={{ opacity: 0, pointerEvents: 'none' as const }}
            transition={{ duration: 0.15 }}
            onClick={state.profile.password ? () => setShowProfile(false) : undefined}
          >
            <motion.div
              ref={profileRef}
              className="panel-popup"
              role="dialog"
              aria-modal="true"
              aria-label="Профіль"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="panel-popup-close" aria-label="Закрити" onClick={() => setShowProfile(false)} style={{ display: state.profile.password ? undefined : 'none' }}>✕</button>
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
