'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Minus, Check, X } from 'lucide-react';

interface Exercise {
  id: number;
  name: string;
  category: string;
  primary_muscle: string;
  target_reps?: string;
  target_weight?: number;
  rest_seconds?: number;
  workoutExerciseId?: number;
}

interface WorkoutSet {
  setNumber: number;
  reps: number;
  weight: number;
  rpe?: number;
  setType: 'warmup' | 'normal' | 'dropset' | 'failure';
  completed: boolean;
}

interface HistoricalSet {
  setNumber: number;
  reps: number;
  weight: number | null;
  rpe?: number | null;
  setType: WorkoutSet['setType'];
}

interface PreviousPerformanceState {
  sets: HistoricalSet[];
  lastPerformedAt: string | null;
  loading: boolean;
  error?: string;
}

interface ActiveWorkoutProps {
  sessionId: number;
  exercises: Exercise[];
  onComplete: () => void;
}

export function ActiveWorkout({ sessionId, exercises, onComplete }: ActiveWorkoutProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sets, setSets] = useState<Record<number, WorkoutSet[]>>({});
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [currentSet, setCurrentSet] = useState<Partial<WorkoutSet>>({
    reps: 10,
    weight: 0,
    setType: 'normal',
  });
  const [previousPerformance, setPreviousPerformance] = useState<Record<number, PreviousPerformanceState>>({});

  const currentExercise = exercises[currentExerciseIndex];

  // Workout duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setWorkoutDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Rest timer
  useEffect(() => {
    if (restTimer === null) return;

    if (restTimer === 0) {
      // Play notification sound
      const audio = new Audio('/sounds/timer-end.mp3');
      audio.play().catch(() => {});
      setRestTimer(null);
      return;
    }

    const timeout = setTimeout(() => {
      setRestTimer(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [restTimer]);

  // Get previous performance for this exercise
  const getPreviousPerformance = useCallback(async (exerciseId: number) => {
    const response = await fetch(`/api/v1/exercises/${exerciseId}/last-performance`);

    if (!response.ok) {
      throw new Error('Failed to fetch previous performance');
    }

    const data = await response.json();
    const setsArray = Array.isArray(data.sets) ? data.sets : [];

    const normalizedSets: HistoricalSet[] = setsArray.map((set: any) => {
      const rawWeight = set.weight ?? set.weight_kg ?? set.weightKg ?? null;
      const parsedWeight =
        rawWeight === null || rawWeight === undefined ? null : Number(rawWeight);
      const numericWeight =
        parsedWeight !== null && Number.isFinite(parsedWeight) ? parsedWeight : null;

      return {
        setNumber: set.setNumber ?? set.set_number ?? 0,
        reps: Number(set.reps) || 0,
        weight: numericWeight,
        rpe: set.rpe ?? null,
        setType: (set.setType || set.set_type || 'normal') as WorkoutSet['setType'],
      };
    });

    return {
      sets: normalizedSets,
      lastPerformedAt: data.lastPerformedAt ?? data.last_performed_at ?? null,
    };
  }, []);

  const currentExerciseId = currentExercise?.id;

  const performanceEntry = currentExerciseId ? previousPerformance[currentExerciseId] : undefined;

  useEffect(() => {
    if (!currentExerciseId || performanceEntry) {
      return;
    }

    let cancelled = false;

    setPreviousPerformance(prev => ({
      ...prev,
      [currentExerciseId]: {
        sets: [],
        lastPerformedAt: null,
        loading: true,
      },
    }));

    getPreviousPerformance(currentExerciseId)
      .then(data => {
        if (cancelled) return;
        setPreviousPerformance(prev => ({
          ...prev,
          [currentExerciseId]: {
            sets: data.sets,
            lastPerformedAt: data.lastPerformedAt,
            loading: false,
          },
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setPreviousPerformance(prev => ({
          ...prev,
          [currentExerciseId]: {
            sets: [],
            lastPerformedAt: null,
            loading: false,
            error: 'Failed to load previous performance',
          },
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [currentExerciseId, performanceEntry, getPreviousPerformance]);

  // Log a set
  const logSet = async () => {
    if (!currentExercise || !currentSet.reps || !currentSet.weight || !currentExercise.workoutExerciseId) return;

    const exerciseSets = sets[currentExercise.id] || [];
    const setNumber = exerciseSets.length + 1;

    const newSet: WorkoutSet = {
      setNumber,
      reps: currentSet.reps,
      weight: currentSet.weight,
      rpe: currentSet.rpe,
      setType: currentSet.setType || 'normal',
      completed: true,
    };

    // Save to backend
    try {
      const response = await fetch(`/api/v1/workouts/${sessionId}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: currentExercise.id,
          workoutExerciseId: currentExercise.workoutExerciseId,
          ...newSet,
        }),
      });

      if (!response.ok) throw new Error('Failed to log set');

      // Update local state
      setSets(prev => ({
        ...prev,
        [currentExercise.id]: [...(prev[currentExercise.id] || []), newSet],
      }));

      // Start rest timer
      const restSeconds = currentExercise.rest_seconds || 90;
      setRestTimer(restSeconds);

      // Show PR notification if applicable
      const data = await response.json();
      if (data.isPersonalRecord) {
        // Show PR notification
        console.log('🎉 Personal Record!');
      }
    } catch (error) {
      console.error('Failed to log set:', error);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentExercise) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>No exercises in this workout</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This session doesn&apos;t have any exercises yet. Return to the workouts page and start
              a routine to preload exercises, or extend this logger to support ad-hoc exercise selection.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Active Workout</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">{formatDuration(workoutDuration)}</span>
              </div>
              <Button variant="destructive" size="sm" onClick={onComplete}>
                End Workout
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Rest Timer */}
      {restTimer !== null && (
        <Card className="bg-primary/10 border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Rest Timer</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl">
                  {Math.floor(restTimer / 60)}:{(restTimer % 60).toString().padStart(2, '0')}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRestTimer(null)}
                >
                  Skip
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise Tabs */}
      <Tabs value={currentExerciseIndex.toString()} onValueChange={(v) => setCurrentExerciseIndex(parseInt(v))}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {exercises.map((exercise, index) => (
            <TabsTrigger key={exercise.id} value={index.toString()}>
              <div className="flex items-center gap-2">
                {exercise.name}
                {sets[exercise.id]?.length > 0 && (
                  <Badge variant="secondary">{sets[exercise.id].length}</Badge>
                )}
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {exercises.map((exercise, index) => {
          const performanceState = previousPerformance[exercise.id];

          return (
            <TabsContent key={exercise.id} value={index.toString()} className="space-y-4">
            {/* Exercise Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{exercise.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {exercise.category} • {exercise.primary_muscle}
                    </p>
                  </div>
                  {exercise.target_reps && (
                    <Badge variant="outline">
                      Target: {exercise.target_reps} reps
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>

            {performanceState && (
              <Card>
                <CardHeader>
                  <CardTitle>Previous Session</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {performanceState.loading
                      ? 'Loading previous data...'
                      : performanceState.lastPerformedAt
                        ? `Completed ${formatDistanceToNow(new Date(performanceState.lastPerformedAt), { addSuffix: true })}`
                        : 'No completed sessions yet'}
                  </p>
                </CardHeader>
                <CardContent>
                  {performanceState.loading ? (
                    <div className="text-sm text-muted-foreground">Retrieving sets...</div>
                  ) : performanceState.sets.length > 0 ? (
                    <div className="space-y-2">
                      {performanceState.sets.map(set => (
                        <div
                          key={set.setNumber}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <span>
                            Set {set.setNumber}
                            {set.setType !== 'normal' && (
                              <Badge variant="outline" className="ml-2">
                                {set.setType}
                              </Badge>
                            )}
                          </span>
                          <span className="font-mono">
                            {set.weight !== null ? `${set.weight}kg` : '--'} × {set.reps}
                            {set.rpe && <span className="text-muted-foreground ml-2">RPE {set.rpe}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {performanceState.error || 'No previous sets logged'}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Set Logger */}
            <Card>
              <CardHeader>
                <CardTitle>Log Set</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setCurrentSet(prev => ({
                          ...prev,
                          weight: Math.max(0, (prev.weight || 0) - 2.5)
                        }))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={currentSet.weight}
                        onChange={(e) => setCurrentSet(prev => ({
                          ...prev,
                          weight: parseFloat(e.target.value)
                        }))}
                        className="text-center"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setCurrentSet(prev => ({
                          ...prev,
                          weight: (prev.weight || 0) + 2.5
                        }))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Reps</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setCurrentSet(prev => ({
                          ...prev,
                          reps: Math.max(1, (prev.reps || 1) - 1)
                        }))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={currentSet.reps}
                        onChange={(e) => setCurrentSet(prev => ({
                          ...prev,
                          reps: parseInt(e.target.value)
                        }))}
                        className="text-center"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setCurrentSet(prev => ({
                          ...prev,
                          reps: (prev.reps || 0) + 1
                        }))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>RPE (1-10)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={currentSet.rpe || ''}
                      onChange={(e) => setCurrentSet(prev => ({
                        ...prev,
                        rpe: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Set Type</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={currentSet.setType}
                      onChange={(e) => setCurrentSet(prev => ({
                        ...prev,
                        setType: e.target.value as WorkoutSet['setType']
                      }))}
                    >
                      <option value="warmup">Warmup</option>
                      <option value="normal">Normal</option>
                      <option value="dropset">Dropset</option>
                      <option value="failure">Failure</option>
                    </select>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={logSet}
                  disabled={!currentSet.weight || !currentSet.reps}
                >
                  <Check className="h-5 w-5 mr-2" />
                  Complete Set
                </Button>
              </CardContent>
            </Card>

            {/* Completed Sets */}
            {sets[exercise.id]?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Completed Sets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sets[exercise.id].map((set, setIndex) => (
                      <div
                        key={setIndex}
                        className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                      >
                        <span className="text-sm font-medium">
                          Set {set.setNumber}
                          {set.setType !== 'normal' && (
                            <Badge variant="outline" className="ml-2">
                              {set.setType}
                            </Badge>
                          )}
                        </span>
                        <span className="font-mono">
                          {set.weight}kg × {set.reps}
                          {set.rpe && <span className="text-muted-foreground ml-2">RPE {set.rpe}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        );
        })}
      </Tabs>
    </div>
  );
}
