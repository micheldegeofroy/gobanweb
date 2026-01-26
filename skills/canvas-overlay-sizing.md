# Canvas Overlay Sizing Pattern

## Problem
When placing HTML elements (like images or divs) as overlays on a canvas that gets CSS-scaled, the overlay size needs to match the visible canvas elements.

## Solution

### 1. Calculate the CSS scale factor
```typescript
const canvas = canvasRef.current;
const rect = canvas.getBoundingClientRect();
const scaleX = rect.width / canvas.width;
const scaleY = rect.height / canvas.height;
const scale = Math.min(scaleX, scaleY);
```

### 2. Calculate actual visible element size
```typescript
// If drawing stones with radius = cellSize * 0.45
// Then diameter on canvas = cellSize * 0.9
// Visible diameter on screen = cellSize * 0.9 * scale
const stoneDiameter = cellSize * 0.9 * scale;
```

### 3. Add a minimum size for visibility
```typescript
const actualSize = Math.max(stoneDiameter, 30); // At least 30px
```

### 4. Position overlay elements using scaled coordinates
```typescript
const canvasX = padding + gridX * cellSize;
const canvasY = padding + gridY * cellSize;

return {
  x: canvasX * scaleX,  // Screen position
  y: canvasY * scaleY,
  size: actualSize,     // Screen size
};
```

## Key Insight
- Canvas elements are drawn at native resolution, then CSS scales the entire canvas
- Overlay elements need to be sized for the SCREEN, not the canvas
- Always multiply canvas dimensions by the scale factor for overlays
