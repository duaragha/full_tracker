'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Conflict {
  id: number;
  plex_title: string;
  plex_year: number | null;
  conflict_type: string;
  potential_matches: any[];
  created_at: string;
}

export function ConflictResolver() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState<number | null>(null);
  const [selectedShow, setSelectedShow] = useState<string>('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    try {
      const response = await fetch('/api/plex/conflicts');
      const data = await response.json();
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveConflict = async (action: string) => {
    if (!selectedConflict) return;

    setResolving(true);
    try {
      const response = await fetch(`/api/plex/conflicts/${selectedConflict}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          tvshowId: selectedShow ? parseInt(selectedShow) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Remove resolved conflict from list
        setConflicts(conflicts.filter(c => c.id !== selectedConflict));
        setSelectedConflict(null);
        setSelectedShow('');
      } else {
        alert(`Failed to resolve conflict: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      alert('Failed to resolve conflict');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading conflicts...</div>;
  }

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Conflicts</CardTitle>
          <CardDescription>
            All shows from Plex have been successfully matched to your tracker!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Resolve Show Conflicts ({conflicts.length})</h2>

      {conflicts.map((conflict) => (
        <Card key={conflict.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>
                  {conflict.plex_title} {conflict.plex_year && `(${conflict.plex_year})`}
                </CardTitle>
                <CardDescription>From Plex - needs manual matching</CardDescription>
              </div>
              <Badge variant={conflict.conflict_type === 'no_match' ? 'destructive' : 'secondary'}>
                {conflict.conflict_type.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {conflict.potential_matches && conflict.potential_matches.length > 0 ? (
              <>
                <Label>Select the correct show from your tracker:</Label>
                <RadioGroup
                  value={selectedConflict === conflict.id ? selectedShow : ''}
                  onValueChange={(value) => {
                    setSelectedConflict(conflict.id);
                    setSelectedShow(value);
                  }}
                >
                  {conflict.potential_matches.map((match: any) => (
                    <div key={match.id} className="flex items-center space-x-2 border p-3 rounded">
                      <RadioGroupItem value={match.id.toString()} id={`match-${match.id}`} />
                      <Label htmlFor={`match-${match.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{match.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {match.first_aired && `First aired: ${new Date(match.first_aired).getFullYear()}`}
                          {match.confidence && ` • Match confidence: ${(match.confidence * 100).toFixed(0)}%`}
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                No potential matches found in your tracker.
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  setSelectedConflict(conflict.id);
                  resolveConflict('select');
                }}
                disabled={selectedConflict !== conflict.id || !selectedShow || resolving}
              >
                {resolving ? 'Resolving...' : 'Confirm Match'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedConflict(conflict.id);
                  resolveConflict('create_new');
                }}
                disabled={resolving}
              >
                Add to Tracker Manually
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedConflict(conflict.id);
                  resolveConflict('ignore');
                }}
                disabled={resolving}
              >
                Ignore
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
