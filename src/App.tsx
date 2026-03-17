import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GameProvider, useGame } from './state/GameContext';
import { getFarmerId, sendFriendRequest, ensureProfile } from './firebase/db';
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

  // Apply season class to body for background
  useEffect(() => {
    document.body.className = `season-${state.season}`;
  }, [state.season]);

  const [cropSelector, setCropSelector] = useState<{
    plotIndex: number;
    position: { x: number; y: number };
  } | null>(null);
  const [showProfile, setShowProfile] = useState(!state.profile.name);
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [visitingFriendId, setVisitingFriendId] = useState<string | null>(null);

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
          dispatch({ type: 'COLLECT_WOOD', plotIndex });
          showToast('🪵 Дрова зібрано!', 'earn');
          break;
        }
        case 'growing':
          break;
      }
    },
    [state.plots, state.coins, state.level, dispatch],
  );

  const handleAnimalClick = useCallback(
    (animalIndex: number) => {
      const slot = state.animals[animalIndex];
      if (slot) {
        const animal = ANIMALS[slot.animalId];
        showToast(`${animal.productEmoji} ${animal.productName} зібрано! +${animal.productSellPrice}💰`, 'earn');
      }
      dispatch({ type: 'COLLECT_PRODUCT', animalIndex });
    },
    [dispatch, state.animals],
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
        </button>
      </div>
      )}

      {/* Panel popup */}
      {activePanel && (
        <div className="panel-popup-overlay" onClick={() => setActivePanel(null)}>
          <div className="panel-popup" onClick={(e) => e.stopPropagation()}>
            <button className="panel-popup-close" onClick={() => setActivePanel(null)}>✕</button>
            {activePanel === 'shop' && <ShopPanel />}
            {activePanel === 'crafting' && <CraftingPanel />}
            {activePanel === 'orders' && <OrdersPanel />}
            {activePanel === 'inventory' && <Inventory onClose={() => setActivePanel(null)} />}
            {activePanel === 'friends' && <NeighborsPanel onVisitFriend={handleVisitFriend} />}
          </div>
        </div>
      )}

      {cropSelector && (
        state.season === 'winter' && state.plots[cropSelector.plotIndex]?.status === 'empty' ? (
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
        )
      )}
      {showProfile && (
        <ProfileEditor onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
