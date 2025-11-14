'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert'
import { Plus, Edit, Trash2, FolderOpen, Folder, TrendingUp } from 'lucide-react'
import {
  getCollectionsAction,
  createCollectionAction,
  updateCollectionAction,
  deleteCollectionAction,
  getCollectionStatsAction,
} from '@/app/actions/collections'
import { Collection } from '@/lib/db/collections-store'

const COLOR_OPTIONS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#64748b', label: 'Gray' },
]

const ICON_OPTIONS = [
  { value: 'folder', label: 'Folder', icon: Folder },
  { value: 'folder-open', label: 'Folder Open', icon: FolderOpen },
]

export default function CollectionsPage() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    color: COLOR_OPTIONS[0].value,
    icon: ICON_OPTIONS[0].value,
  })

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)

  // Delete confirmation state
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [collectionsData, statsData] = await Promise.all([
        getCollectionsAction({ includeEmpty: true, sortBy: 'count' }),
        getCollectionStatsAction(),
      ])
      setCollections(collectionsData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load collections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newCollection.name.trim()) return

    try {
      await createCollectionAction({
        name: newCollection.name.trim(),
        description: newCollection.description.trim() || undefined,
        color: newCollection.color,
        icon: newCollection.icon,
      })
      setCreateDialogOpen(false)
      setNewCollection({
        name: '',
        description: '',
        color: COLOR_OPTIONS[0].value,
        icon: ICON_OPTIONS[0].value,
      })
      loadData()
    } catch (error) {
      console.error('Failed to create collection:', error)
      alert('Failed to create collection')
    }
  }

  const handleEdit = async () => {
    if (!editingCollection) return

    try {
      await updateCollectionAction(editingCollection.id, {
        name: editingCollection.name.trim(),
        description: editingCollection.description?.trim() || undefined,
        color: editingCollection.color || undefined,
        icon: editingCollection.icon || undefined,
      })
      setEditDialogOpen(false)
      setEditingCollection(null)
      loadData()
    } catch (error) {
      console.error('Failed to update collection:', error)
      alert('Failed to update collection')
    }
  }

  const handleDelete = async () => {
    if (!collectionToDelete) return

    try {
      await deleteCollectionAction(collectionToDelete.id)
      setDeleteAlertOpen(false)
      setCollectionToDelete(null)
      loadData()
    } catch (error) {
      console.error('Failed to delete collection:', error)
      alert('Failed to delete collection')
    }
  }

  const handleViewCollection = (collectionId: number) => {
    router.push(`/highlights/collections/${collectionId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading collections...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground mt-1">
            Organize highlights into curated collections
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
              <DialogDescription>
                Create a collection to organize related highlights
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="collection-name">Name *</Label>
                <Input
                  id="collection-name"
                  value={newCollection.name}
                  onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                  placeholder="e.g., Reading List, Favorites, Research..."
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collection-description">Description</Label>
                <Textarea
                  id="collection-description"
                  value={newCollection.description}
                  onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                  placeholder="Optional description for this collection"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewCollection({ ...newCollection, color: color.value })}
                      className={`
                        w-10 h-10 rounded-full transition-all
                        ${newCollection.color === color.value ? 'ring-2 ring-primary ring-offset-2' : ''}
                      `}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newCollection.name.trim()}>
                Create Collection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCollections}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Highlights</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHighlightsInCollections}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Largest Collection</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.topCollections[0]?.name || 'None'}
              </div>
              {stats.topCollections[0] && (
                <p className="text-xs text-muted-foreground">
                  {stats.topCollections[0].count} highlights
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Collections Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collections.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Folder className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No collections yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first collection to organize highlights
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Collection
              </Button>
            </CardContent>
          </Card>
        ) : (
          collections.map((collection) => (
            <Card
              key={collection.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => handleViewCollection(collection.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: collection.color || '#64748b' }}
                  >
                    <Folder className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingCollection(collection)
                        setEditDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCollectionToDelete(collection)
                        setDeleteAlertOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-4">{collection.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {collection.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {collection.highlightCount} {collection.highlightCount === 1 ? 'highlight' : 'highlights'}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      {editingCollection && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Collection</DialogTitle>
              <DialogDescription>
                Update collection name, description, or appearance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-collection-name">Name *</Label>
                <Input
                  id="edit-collection-name"
                  value={editingCollection.name}
                  onChange={(e) => setEditingCollection({ ...editingCollection, name: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-collection-description">Description</Label>
                <Textarea
                  id="edit-collection-description"
                  value={editingCollection.description || ''}
                  onChange={(e) => setEditingCollection({ ...editingCollection, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setEditingCollection({ ...editingCollection, color: color.value })}
                      className={`
                        w-10 h-10 rounded-full transition-all
                        ${editingCollection.color === color.value ? 'ring-2 ring-primary ring-offset-2' : ''}
                      `}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!editingCollection.name.trim()}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{collectionToDelete?.name}"? This will remove the collection but won't delete the highlights themselves. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Collection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
