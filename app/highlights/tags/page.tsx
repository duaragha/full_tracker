'use client'

import { useState, useEffect } from 'react'
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
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, Merge, Tag, TrendingUp } from 'lucide-react'
import {
  getTagsAction,
  createTagAction,
  updateTagAction,
  deleteTagAction,
  mergeTagsAction,
  getTagStatsAction,
} from '@/app/actions/tags'
import { HighlightTag } from '@/types/highlight'
import { useRouter } from 'next/navigation'

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

export default function TagsPage() {
  const router = useRouter()
  const [tags, setTags] = useState<HighlightTag[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', description: '', color: COLOR_OPTIONS[0].value })

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<HighlightTag | null>(null)

  // Delete confirmation state
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<HighlightTag | null>(null)

  // Merge dialog state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [mergeSource, setMergeSource] = useState<number | null>(null)
  const [mergeTarget, setMergeTarget] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tagsData, statsData] = await Promise.all([
        getTagsAction({ includeEmpty: true, sortBy: 'count' }),
        getTagStatsAction(),
      ])
      setTags(tagsData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newTag.name.trim()) return

    try {
      await createTagAction({
        name: newTag.name.trim(),
        description: newTag.description.trim() || undefined,
        color: newTag.color,
      })
      setCreateDialogOpen(false)
      setNewTag({ name: '', description: '', color: COLOR_OPTIONS[0].value })
      loadData()
    } catch (error) {
      console.error('Failed to create tag:', error)
      alert(error instanceof Error ? error.message : 'Failed to create tag')
    }
  }

  const handleEdit = async () => {
    if (!editingTag) return

    try {
      await updateTagAction(editingTag.id, {
        name: editingTag.name.trim(),
        description: editingTag.description?.trim() || undefined,
        color: editingTag.color || undefined,
      })
      setEditDialogOpen(false)
      setEditingTag(null)
      loadData()
    } catch (error) {
      console.error('Failed to update tag:', error)
      alert(error instanceof Error ? error.message : 'Failed to update tag')
    }
  }

  const handleDelete = async () => {
    if (!tagToDelete) return

    try {
      await deleteTagAction(tagToDelete.id)
      setDeleteAlertOpen(false)
      setTagToDelete(null)
      loadData()
    } catch (error) {
      console.error('Failed to delete tag:', error)
      alert('Failed to delete tag')
    }
  }

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return

    try {
      await mergeTagsAction(mergeSource, mergeTarget)
      setMergeDialogOpen(false)
      setMergeSource(null)
      setMergeTarget(null)
      loadData()
    } catch (error) {
      console.error('Failed to merge tags:', error)
      alert(error instanceof Error ? error.message : 'Failed to merge tags')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading tags...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground mt-1">
            Organize and categorize your highlights
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Merge className="mr-2 h-4 w-4" />
                Merge Tags
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Merge Tags</DialogTitle>
                <DialogDescription>
                  Combine two tags by moving all highlights from one tag to another. The source tag will be deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Source Tag (will be deleted)</Label>
                  <Select
                    value={mergeSource?.toString() || ''}
                    onValueChange={(value) => setMergeSource(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tag to merge from" />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id.toString()}>
                          {tag.name} ({tag.highlightCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Tag (will receive highlights)</Label>
                  <Select
                    value={mergeTarget?.toString() || ''}
                    onValueChange={(value) => setMergeTarget(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tag to merge into" />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id.toString()}>
                          {tag.name} ({tag.highlightCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleMerge}
                  disabled={!mergeSource || !mergeTarget || mergeSource === mergeTarget}
                >
                  Merge Tags
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Tag</DialogTitle>
                <DialogDescription>
                  Add a new tag to organize your highlights
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tag-name">Name *</Label>
                  <Input
                    id="tag-name"
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    placeholder="e.g., Important, To Review, Quotes..."
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tag-description">Description</Label>
                  <Textarea
                    id="tag-description"
                    value={newTag.description}
                    onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                    placeholder="Optional description for this tag"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewTag({ ...newTag, color: color.value })}
                        className={`
                          w-10 h-10 rounded-full transition-all
                          ${newTag.color === color.value ? 'ring-2 ring-primary ring-offset-2' : ''}
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
                <Button onClick={handleCreate} disabled={!newTag.name.trim()}>
                  Create Tag
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTags}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tagged Highlights</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTaggedHighlights}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Used Tag</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.topTags[0]?.name || 'None'}
              </div>
              {stats.topTags[0] && (
                <p className="text-xs text-muted-foreground">
                  {stats.topTags[0].count} highlights
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tags List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tags ({tags.length})</CardTitle>
          <CardDescription>
            Manage your tags and see how many highlights use each one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No tags yet</p>
              <p className="text-sm mb-6">Create your first tag to start organizing highlights</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Tag
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color || '#64748b' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{tag.name}</h3>
                        <Badge variant="secondary">{tag.highlightCount} highlights</Badge>
                      </div>
                      {tag.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {tag.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTag(tag)
                        setEditDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTagToDelete(tag)
                        setDeleteAlertOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingTag && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tag</DialogTitle>
              <DialogDescription>
                Update tag name, description, or color
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-tag-name">Name *</Label>
                <Input
                  id="edit-tag-name"
                  value={editingTag.name}
                  onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tag-description">Description</Label>
                <Textarea
                  id="edit-tag-description"
                  value={editingTag.description || ''}
                  onChange={(e) => setEditingTag({ ...editingTag, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setEditingTag({ ...editingTag, color: color.value })}
                      className={`
                        w-10 h-10 rounded-full transition-all
                        ${editingTag.color === color.value ? 'ring-2 ring-primary ring-offset-2' : ''}
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
              <Button onClick={handleEdit} disabled={!editingTag.name.trim()}>
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
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{tagToDelete?.name}"? This will remove the tag from {tagToDelete?.highlightCount} highlight(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
