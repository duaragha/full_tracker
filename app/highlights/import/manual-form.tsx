'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { createManualHighlightAction } from '@/app/actions/highlights'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? 'Saving...' : 'Save Highlight'}
    </Button>
  )
}

export function ManualHighlightForm() {
  const [state, formAction] = useFormState(createManualHighlightAction, undefined)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="highlightText">Highlight Text *</Label>
        <Textarea
          id="highlightText"
          name="highlightText"
          placeholder="Enter the text you want to highlight..."
          rows={4}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sourceTitle">Source Title *</Label>
          <Input
            id="sourceTitle"
            name="sourceTitle"
            placeholder="Book or article title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourceAuthor">Author</Label>
          <Input
            id="sourceAuthor"
            name="sourceAuthor"
            placeholder="Author name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Your Note (Optional)</Label>
        <Textarea
          id="note"
          name="note"
          placeholder="Add your thoughts or notes about this highlight..."
          rows={3}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location">Page/Location</Label>
          <Input
            id="location"
            name="location"
            placeholder="e.g., Page 42 or Location 1234"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Highlight Color</Label>
          <select
            id="color"
            name="color"
            defaultValue="yellow"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="yellow">Yellow</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="pink">Pink</option>
            <option value="purple">Purple</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" asChild>
          <Link href="/highlights">Cancel</Link>
        </Button>
        <SubmitButton />
      </div>
    </form>
  )
}
