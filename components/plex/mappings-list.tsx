'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Mapping {
  id: number;
  plex_title: string;
  plex_year: number | null;
  tracker_title: string | null;
  match_confidence: number;
  match_method: string;
  manually_confirmed: boolean;
  sync_enabled: boolean;
  created_at: string;
}

export function MappingsList() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/plex/mappings');
      const data = await response.json();
      setMappings(data.mappings || []);
    } catch (error) {
      console.error('Failed to fetch mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'outline'> = {
      tmdb_id: 'default',
      tvdb_id: 'default',
      imdb_id: 'default',
      title_year: 'secondary',
      manual: 'outline',
    };

    return (
      <Badge variant={colors[method] || 'secondary'}>
        {method.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Show Mappings</CardTitle>
        <CardDescription>
          Plex shows mapped to your tracker ({mappings.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading mappings...</div>
        ) : mappings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No mappings yet. Watch a show on Plex to create the first mapping!
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plex Show</TableHead>
                  <TableHead>Tracker Show</TableHead>
                  <TableHead>Match Method</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-medium">
                      {mapping.plex_title}
                      {mapping.plex_year && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({mapping.plex_year})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{mapping.tracker_title || 'Unknown'}</TableCell>
                    <TableCell>
                      {getMethodBadge(mapping.match_method)}
                      {mapping.manually_confirmed && (
                        <Badge variant="outline" className="ml-2">
                          Manual
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          mapping.match_confidence >= 0.9
                            ? 'text-green-600'
                            : mapping.match_confidence >= 0.7
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }
                      >
                        {(mapping.match_confidence * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {mapping.sync_enabled ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
