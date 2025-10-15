# Nested Items Implementation Guide

## Overview
This feature allows items to contain other items (e.g., tracking a PC and its individual components like GPU, CPU, RAM).

## What's Been Implemented

### 1. Database Schema ✅
- **Migration**: `db/migrations/009_add_nested_items.sql`
- Added `parent_item_id` column to `inventory_items` table
- Self-referencing foreign key with CASCADE delete
- Index on `parent_item_id` for performance
- Check constraint to prevent self-referencing

### 2. TypeScript Types ✅
- **File**: `types/inventory.ts`
- Added `parentItemId?: string | null` - Reference to parent item
- Added `children?: InventoryItem[]` - Array of child items (populated when fetched hierarchically)

### 3. Database Functions ✅
- **File**: `lib/db/inventory-store.ts`
- Updated `normalizeInventoryItem()` to handle parent/child fields
- Updated `addInventoryItem()` to accept `parentItemId`
- Updated `updateInventoryItem()` to support updating `parentItemId`
- Added `getInventoryItemsWithChildren()` - Fetches all items in hierarchical structure
- Added `getChildItems(parentId)` - Fetches direct children of a specific item

## How It Works

### Database Structure
```sql
inventory_items
├── id (primary key)
├── name
├── parent_item_id (references inventory_items.id)
└── ... other fields
```

### Example Data
```
PC (id: 1, parent_item_id: null)
├── GPU (id: 2, parent_item_id: 1)
├── CPU (id: 3, parent_item_id: 1)
└── RAM (id: 4, parent_item_id: 1)
```

### API Usage

#### Creating a Parent Item
```typescript
await addInventoryItem({
  name: "Gaming PC",
  type: "Electronics",
  parentItemId: null, // No parent = root level item
  // ... other fields
})
```

#### Creating a Child Item
```typescript
await addInventoryItem({
  name: "RTX 4090 GPU",
  type: "Computer Part",
  parentItemId: "1", // Reference to PC item
  // ... other fields
})
```

#### Fetching Hierarchical Data
```typescript
// Get all items with their children populated
const itemsWithChildren = await getInventoryItemsWithChildren()

// Get only children of a specific item
const childItems = await getChildItems(1)
```

## UI Integration Tasks Remaining

### Task 1: Display Nested Items
**Location**: Inventory page component

**Implementation Ideas**:
1. **Expandable Rows**: Add expand/collapse icons next to items that have children
2. **Indentation**: Visually indent child items to show hierarchy
3. **Tree View**: Use a tree component with expand/collapse functionality
4. **Badge**: Show count of child items (e.g., "PC (3 parts)")

**Example UI**:
```
📦 Gaming PC [▼]
  ├─ RTX 4090 GPU
  ├─ Intel i9-13900K
  └─ 32GB DDR5 RAM
📦 Toolbox [▶]
```

### Task 2: Create/Edit Form Updates
**Location**: Item form component

**Add**:
1. **Parent Item Dropdown**: Dropdown to select parent item (or "None" for root)
2. **Filter**: Only show items that could be valid parents (prevent circular references)
3. **Visual Feedback**: Show hierarchy when editing

**Form Fields**:
```typescript
<select name="parentItemId">
  <option value="">No Parent (Root Item)</option>
  {items.filter(i => i.id !== currentItemId).map(item => (
    <option value={item.id}>{item.name}</option>
  ))}
</select>
```

### Task 3: Additional Features (Optional)
- **Move Items**: Drag-and-drop to reparent items
- **Bulk Operations**: Apply actions to parent and all children
- **Search**: Search within nested structures
- **Breadcrumbs**: Show item path (e.g., "PC > Components > GPU")

## Running the Migration

To apply the database changes:
```bash
# Option 1: Through the app migration endpoint
curl http://localhost:3000/api/migrate

# Option 2: Direct SQL
psql $DATABASE_URL -f db/migrations/009_add_nested_items.sql
```

## Important Notes

1. **Cascade Delete**: When a parent item is deleted, all children are automatically deleted
2. **Depth Limit**: Current implementation doesn't enforce depth limits (can nest infinitely)
3. **Performance**: For very large hierarchies (100+ items), consider optimizing queries
4. **Circular References**: The check constraint prevents self-referencing, but doesn't prevent circular chains (A→B→C→A)

## Example Use Cases

1. **Computer and Parts**: Track PC as whole, then individual components (GPU, CPU, RAM, etc.)
2. **Tool Set**: Tool box as parent, individual tools as children
3. **Board Game Collection**: Game box with expansions as children
4. **Kitchen Appliances**: Stand mixer with attachments as children
5. **Camera Gear**: Camera body with lenses, batteries, accessories as children
