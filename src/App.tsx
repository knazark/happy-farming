import { useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route, Outlet, useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GameProvider, useGame } from './state/GameContext';
import { getFarmerId, sendFriendRequest, ensureProfileRTDB } from './firebase/rtdb';
import { LoginScreen } from './components/LoginScreen';
import { RequireAuth } from './components/guards/RequireAuth';
import { GuestOnly } from './components/guards/GuestOnly';
import { ProfilePage } from './pages/ProfilePage';
import { FriendFarmPage } from './pages/FriendFarmPage';
import { useFriends } from './hooks/useFriends';
import { useFocusTrap } from './hooks/useFocusTrap';
import { FarmView } from './components/FarmView';
import { ToastContainer, showToast } from './components/Toast';
import { getUnlockCost, getUnlockLevel } from './engine/economy';
import { ANIMALS } from './constants/animals';
import { CROPS } from './constants/crops';
import { HUD } from './components/HUD';
import { WeatherEffects } from './components/WeatherEffects';
import { RainbowAnimation } from './components/RainbowAnimation';
import { Inventory } from './components/Inventory';
import { ShopPanel } from './components/ShopPanel';
import { CropSelector } from './components/CropSelector';
import { WinterSelector } from './components/WinterSelector';
import { CraftingPanel } from './components/CraftingPanel';
import { OrdersPanel } from './components/OrdersPanel';
import { SeasonalBackground } from './components/SeasonalBackground';
import { NeighborsPanel } from './components/NeighborsPanel';
import { useHarvestEffect, HarvestEffectLayer } from './components/HarvestEffect';
import './App.css';
import './styles/farm.css';

type PanelId = 'shop' | 'crafting' | 'orders' | 'inventory' | 'friends' | null;

function GameContent() {
  const { state, dispatch } = useGame();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Redirect to profile if name or password is missing
  useEffect(() => {
    if (!state.profile.name || !state.profile.password) {
      navigate('/profile', { replace: true });
    }
  }, [state.profile.name, state.profile.password, navigate]);

  // Handle invite link
  useEffect(() => {
    const inviteId = searchParams.get('invite');
    if (inviteId && inviteId !== getFarmerId()) {
      ensureProfileRTDB(getFarmerId(), state).then(() =>
        sendFriendRequest(getFarmerId(), inviteId)
      ).then(ok => {
        if (ok) showToast('📨 Запит на дружбу надіслано!', 'info');
        else showToast('🏘️ Вже друзі або запит вже надіслано', 'info');
        navigate('/game', { replace: true });
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

  // Rainbow easter egg animation
  const [showRainbow, setShowRainbow] = useState(false);
  const prevPlotsRef = useRef('');
  useEffect(() => {
    // Check rainbow: 6 identical crops in any row
    const cols = 6;
    for (let row = 0; row + cols <= state.plots.length; row += cols) {
      const rowPlots = state.plots.slice(row, row + cols);
      const first = rowPlots[0];
      if ((first.status === 'growing' || first.status === 'ready')) {
        const target = first.cropId;
        if (rowPlots.every((p) => (p.status === 'growing' || p.status === 'ready') && p.cropId === target)) {
          // Check it's a new match (not same as last check)
          const key = `${row}:${target}`;
          if (prevPlotsRef.current !== key) {
            prevPlotsRef.current = key;
            setShowRainbow(true);
          }
          break;
        }
      }
    }
  }, [state.plots]);

  const [cropSelector, setCropSelector] = useState<{
    plotIndex: number;
    position: { x: number; y: number };
  } | null>(null);
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const { pendingRequests } = useFriends();
  const { effects, spawnEffect } = useHarvestEffect();

  // Focus trap refs for modals
  const panelRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const closePanelCb = useCallback(() => setActivePanel(null), []);
  const closeCropCb = useCallback(() => setCropSelector(null), []);
  useFocusTrap(panelRef, !!activePanel, closePanelCb);
  useFocusTrap(cropRef, !!cropSelector, closeCropCb);

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
            showToast('🧺 Інвентар повний! Продайте щось або збільшіть місце', 'info');
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
            showToast('🧺 Інвентар повний! Продайте щось або збільшіть місце', 'info');
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
        showToast('🧺 Інвентар повний! Продайте щось або збільшіть місце', 'info');
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
      {showRainbow && <RainbowAnimation onComplete={() => setShowRainbow(false)} />}
      <HarvestEffectLayer effects={effects} />
      <HUD />

      <div className="game-center">
        <FarmView onPlotClick={handlePlotClick} onAnimalClick={handleAnimalClick} onOpenShop={() => setActivePanel('shop')} />
      </div>

      {/* Bottom bar */}
      <div className="bottom-bar">
        <button
          className={`bar-btn ${activePanel === 'shop' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('shop')}
          aria-label="Магазин"
          aria-current={activePanel === 'shop' ? 'page' : undefined}
        >
          <span className="bar-btn-icon" aria-hidden="true">🏡</span>
          <span className="bar-btn-label">Ринок</span>
        </button>
        <button
          className={`bar-btn ${activePanel === 'crafting' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('crafting')}
          aria-label="Крафт"
          aria-current={activePanel === 'crafting' ? 'page' : undefined}
        >
          <span className="bar-btn-icon" aria-hidden="true">🧑‍🍳</span>
          <span className="bar-btn-label">Крафт</span>
          {craftReady > 0 && <span className="bar-badge">{craftReady}</span>}
        </button>
        <button
          className={`bar-btn ${activePanel === 'orders' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('orders')}
          aria-label="Замовлення"
          aria-current={activePanel === 'orders' ? 'page' : undefined}
        >
          <span className="bar-btn-icon" aria-hidden="true">📜</span>
          <span className="bar-btn-label">Замовлення</span>
          {readyOrders > 0 && <span className="bar-badge">{readyOrders}</span>}
        </button>
        <button
          className={`bar-btn ${activePanel === 'inventory' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('inventory')}
          aria-label="Інвентар"
          aria-current={activePanel === 'inventory' ? 'page' : undefined}
        >
          <span className="bar-btn-icon" aria-hidden="true">🧺</span>
          <span className="bar-btn-label">Інвентар</span>
          {inventoryCount > 0 && <span className="bar-badge">{inventoryCount}</span>}
        </button>
        <button
          className={`bar-btn ${activePanel === 'friends' ? 'bar-btn-active' : ''}`}
          onClick={() => togglePanel('friends')}
          aria-label="Друзі"
          aria-current={activePanel === 'friends' ? 'page' : undefined}
        >
          <span className="bar-btn-icon" aria-hidden="true">🤝</span>
          <span className="bar-btn-label">Друзі</span>
          {pendingRequests.length > 0 && <span className="bar-badge">{pendingRequests.length}</span>}
        </button>
      </div>

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
              {activePanel === 'friends' && <NeighborsPanel />}
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
    </div>
  );
}

function AuthenticatedLayout() {
  return (
    <GameProvider>
      <Outlet />
    </GameProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GuestOnly><LoginScreen /></GuestOnly>} />
      <Route element={<RequireAuth />}>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/game" element={<GameContent />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/friend/:id" element={<FriendFarmPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
