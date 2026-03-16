import { useState } from 'react';
import { useGame } from '../state/GameContext';
import { RECIPES } from '../constants/recipes';
import { CROPS } from '../constants/crops';
import { ANIMALS } from '../constants/animals';
import type { CraftedId, ItemId } from '../types';

function getItemEmoji(itemId: string): string {
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

  const craftingProgress = state.crafting
    ? Math.min(1, (Date.now() - state.crafting.startedAt) / 1000 / state.crafting.craftTime)
    : 0;
  const craftingReady = state.crafting && craftingProgress >= 1;
  const craftingRecipe = state.crafting ? RECIPES[state.crafting.recipeId] : null;

  const maxCraftable = (recipeId: CraftedId): number => {
    const recipe = RECIPES[recipeId];
    if (recipe.unlockLevel > state.level) return 0;
    if (state.crafting) return 0;
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
      <h2 className="panel-title">🔨 Крафт</h2>

      {state.crafting && craftingRecipe && (
        <div className="crafting-active">
          <div className="crafting-active-header">
            <span className="crafting-active-emoji">{craftingRecipe.emoji}</span>
            <span>{craftingRecipe.name}{state.crafting.quantity && state.crafting.quantity > 1 ? ` ×${state.crafting.quantity}` : ''}</span>
          </div>
          <div className="crafting-progress-bar">
            <div className="crafting-progress-fill" style={{ width: `${craftingProgress * 100}%` }} />
          </div>
          {craftingReady ? (
            <button className="btn btn-sell" onClick={() => dispatch({ type: 'COLLECT_CRAFT' })}>
              Забрати!
            </button>
          ) : (
            <span className="crafting-time">
              {(() => {
                const secs = Math.ceil(state.crafting!.craftTime - (Date.now() - state.crafting!.startedAt) / 1000);
                const m = Math.floor(secs / 60);
                const s = secs % 60;
                return m > 0 ? `${m}хв ${s}с` : `${secs}с`;
              })()}
            </span>
          )}
        </div>
      )}

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
                      const enough = have >= need;
                      return (
                        <span key={itemId} className={`recipe-card__ing ${enough ? 'ingredient-ok' : 'ingredient-missing'}`}>
                          {getItemEmoji(itemId)}{have}/{need}
                        </span>
                      );
                    })}
                  </div>
                  <span className="recipe-card__info">
                    💰{recipe.sellPrice} · ⭐{recipe.xpReward}
                  </span>
                  {max > 1 && (
                    <div className="craft-qty">
                      <button className="craft-qty-btn" onClick={() => setQty(recipe.id, qty - 1)}>−</button>
                      <span className="craft-qty-val">{qty}</span>
                      <button className="craft-qty-btn" onClick={() => setQty(recipe.id, qty + 1)}>+</button>
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
    </div>
  );
}
