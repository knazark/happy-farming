import { useState } from 'react';
import { useGame } from '../state/GameContext';
import { RECIPES } from '../constants/recipes';
import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
import { CRAFTING_SLOTS_MAX, craftingUpgradeCost } from '../constants/game';
import { showToast } from './Toast';
import type { CraftedId, ItemId } from '../types';

function getItemEmoji(itemId: string): string {
  if (itemId === 'firewood') return '🪵';
  if (itemId in CROPS) return CROPS[itemId as keyof typeof CROPS].emoji;
  if (itemId.endsWith('_product')) {
    const animalId = itemId.replace('_product', '') as keyof typeof ANIMALS;
    if (animalId in ANIMALS) return ANIMALS[animalId].productEmoji;
  }
  if (itemId in RECIPES) return RECIPES[itemId as keyof typeof RECIPES].emoji;
  return '❓';
}

export function CraftingPanel() {
  const { state, dispatch } = useGame();
  const recipes = Object.values(RECIPES);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const activeSlots = state.crafting;
  const slotsUsed = activeSlots.length;
  const totalSlots = state.craftingSlots;
  const isWinter = state.season === 'winter';
  const canStartNew = isWinter || slotsUsed < totalSlots;
  const upgradeCost = craftingUpgradeCost(totalSlots);
  const canUpgrade = totalSlots < CRAFTING_SLOTS_MAX && state.coins >= upgradeCost;

  // Check if an ingredient is obtainable at current level
  const getIngredientLockLevel = (itemId: string): number | null => {
    if (itemId === 'firewood') return null; // always available in winter
    if (itemId in CROPS) {
      const crop = CROPS[itemId as keyof typeof CROPS];
      return crop.unlockLevel > state.level ? crop.unlockLevel : null;
    }
    if (itemId.endsWith('_product')) {
      const animalId = itemId.replace('_product', '') as keyof typeof ANIMALS;
      if (animalId in ANIMALS) {
        const animal = ANIMALS[animalId];
        return animal.unlockLevel > state.level ? animal.unlockLevel : null;
      }
    }
    if (itemId in RECIPES) {
      const recipe = RECIPES[itemId as keyof typeof RECIPES];
      return recipe.unlockLevel > state.level ? recipe.unlockLevel : null;
    }
    return null;
  };

  const hasLockedIngredients = (recipeId: CraftedId): boolean => {
    const recipe = RECIPES[recipeId];
    return Object.keys(recipe.ingredients).some(id => getIngredientLockLevel(id) !== null);
  };

  const maxCraftable = (recipeId: CraftedId): number => {
    const recipe = RECIPES[recipeId];
    if (recipe.unlockLevel > state.level) return 0;
    if (!canStartNew) return 0;
    if (hasLockedIngredients(recipeId)) return 0;
    let max = Infinity;
    for (const [itemId, needed] of Object.entries(recipe.ingredients)) {
      const have = state.inventory[itemId as ItemId] ?? 0;
      max = Math.min(max, Math.floor(have / (needed ?? 1)));
    }
    return max === Infinity ? 0 : max;
  };

  const getQty = (id: string) => quantities[id] || 1;

  const setQty = (id: string, val: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, val) }));
  };

  return (
    <div className="panel">
      <h2 className="panel-title">🧑‍🍳 Крафт ({slotsUsed}/{isWinter ? '∞' : totalSlots}){isWinter ? ' ❄️×2' : ''}</h2>

      {/* Active crafting slots */}
      {activeSlots.map((slot, idx) => {
        const recipe = RECIPES[slot.recipeId];
        const progress = Math.min(1, (Date.now() - slot.startedAt) / 1000 / slot.craftTime);
        const ready = progress >= 1;

        return (
          <div key={`slot-${idx}`} className="crafting-active">
            <div className="crafting-active-header">
              <span className="crafting-active-emoji">{recipe.emoji}</span>
              <span>{recipe.name}{slot.quantity && slot.quantity > 1 ? ` ×${slot.quantity}` : ''}</span>
            </div>
            <div className="crafting-progress-bar">
              <div className="crafting-progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            {ready ? (
              <button className="btn btn-sell" onClick={() => {
                const totalItems = Object.values(state.inventory).reduce((s, n) => s + (n ?? 0), 0);
                if (totalItems >= state.storageCapacity) {
                  showToast('🧺 Інвентар повний! Продайте щось або збільшіть місце', 'info');
                  return;
                }
                dispatch({ type: 'COLLECT_CRAFT', slotIndex: idx });
              }}>
                Забрати!
              </button>
            ) : (
              <span className="crafting-time">
                {(() => {
                  const secs = Math.ceil(slot.craftTime - (Date.now() - slot.startedAt) / 1000);
                  const m = Math.floor(secs / 60);
                  const s = secs % 60;
                  return m > 0 ? `${m}хв ${s}с` : `${secs}с`;
                })()}
              </span>
            )}
          </div>
        );
      })}

      <div className="recipe-grid-3col">
        {recipes.map((recipe) => {
          const locked = recipe.unlockLevel > state.level;
          const max = maxCraftable(recipe.id);
          const qty = Math.min(getQty(recipe.id), max || 1);
          return (
            <div key={recipe.id} className={`recipe-card ${locked ? 'recipe-card--locked' : ''} ${max >= 1 ? 'recipe-card--available' : ''}`}>
              <div className="recipe-card__emoji">{recipe.emoji}</div>
              <span className="recipe-card__name">{recipe.name}</span>
              {locked ? (
                <span className="recipe-card__lock">🔒 Рів.{recipe.unlockLevel}</span>
              ) : (
                <>
                  <div className="recipe-card__ingredients">
                    {Object.entries(recipe.ingredients).map(([itemId, baseQty]) => {
                      const need = (baseQty ?? 0) * qty;
                      const have = state.inventory[itemId as ItemId] ?? 0;
                      const lockLevel = getIngredientLockLevel(itemId);
                      const enough = !lockLevel && have >= need;
                      return (
                        <span key={itemId} className={`recipe-card__ing ${lockLevel ? 'ingredient-locked' : enough ? 'ingredient-ok' : 'ingredient-missing'}`}>
                          {lockLevel ? `🔒 Рів.${lockLevel}` : `${getItemEmoji(itemId)}${have}/${need}`}
                        </span>
                      );
                    })}
                  </div>
                  <span className="recipe-card__info">
                    💰{recipe.sellPrice} · ✨{recipe.xpReward}
                  </span>
                  {max > 1 && (
                    <div className="craft-qty">
                      <button className="craft-qty-btn" disabled={qty <= 1} onClick={() => setQty(recipe.id, qty - 1)} aria-label="Зменшити кількість">−</button>
                      <span className="craft-qty-val">{qty}</span>
                      <button className="craft-qty-btn" disabled={qty >= max} onClick={() => setQty(recipe.id, Math.min(qty + 1, max))} aria-label="Збільшити кількість">+</button>
                    </div>
                  )}
                  <button
                    className="btn btn-buy recipe-card__btn"
                    disabled={max < 1}
                    onClick={() => dispatch({ type: 'START_CRAFT', recipeId: recipe.id, quantity: qty })}
                  >
                    {qty > 1 ? `×${qty}` : 'Крафт'}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Upgrade crafting slots */}
      {totalSlots < CRAFTING_SLOTS_MAX && (
        <button
          className="btn btn-buy crafting-upgrade-btn"
          disabled={!canUpgrade}
          onClick={() => {
            dispatch({ type: 'UPGRADE_CRAFTING' });
            showToast(`🧑‍🍳 Крафт збільшено! Слотів: ${totalSlots + 1} −${upgradeCost}💰`, 'spend');
          }}
        >
          ⬆️ Збільшити слоти крафту → {totalSlots + 1} ({upgradeCost}💰)
        </button>
      )}
    </div>
  );
}
