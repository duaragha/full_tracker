'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dumbbell,
  Plus,
  Calendar,
  Clock,
  TrendingUp,
  Trophy,
  Activity,
  Target,
  Timer,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  getWorkoutStats,
  getRecentWorkouts,
  getRoutines,
  getExercises,
  getWeeklyProgress,
  startWorkoutSession
} from '@/lib/actions/fitness-workouts';
import { ActiveWorkout } from '@/components/workouts/ActiveWorkout';

interface RecentWorkout {
  id: number;
  name: string;
  date: string;
  duration: number;
  sets: number;
  prs: number;
}

interface Routine {
  id: number;
  name: string;
  folder: string;
  exercises: number;
  lastUsed: string;
}

interface ExerciseItem {
  id: number;
  name: string;
  category: string;
  muscle: string;
  pr: string;
}

interface WeeklyProgressItem {
  hasWorkout: boolean;
}

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

export default function WorkoutsPage() {
  const [activeTab, setActiveTab] = React.useState('overview');
  const [recentWorkouts, setRecentWorkouts] = React.useState<RecentWorkout[]>([]);
  const [routines, setRoutines] = React.useState<Routine[]>([]);
  const [exercises, setExercises] = React.useState<ExerciseItem[]>([]);
  const [weeklyProgress, setWeeklyProgress] = React.useState<WeeklyProgressItem[]>([]);
  const [activeSession, setActiveSession] = React.useState<{ id: number; exercises: Exercise[] } | null>(null);
  const [stats, setStats] = React.useState({
    totalWorkouts: 0,
    thisWeek: 0,
    totalVolume: 0,
    personalRecords: 0
  });
  const [loading, setLoading] = React.useState(true);

  // Load data on component mount
  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, workoutsData, routinesData, exercisesData, weeklyData] = await Promise.all([
        getWorkoutStats(),
        getRecentWorkouts(),
        getRoutines(),
        getExercises(),
        getWeeklyProgress()
      ]);

      setStats(statsData);
      setRecentWorkouts(workoutsData);
      setRoutines(routinesData);
      setExercises(exercisesData);
      setWeeklyProgress(weeklyData);
    } catch (error) {
      console.error('Failed to load workout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = async (routineId?: number) => {
    try {
      const session = await startWorkoutSession(routineId);
      setActiveSession({ id: session.sessionId, exercises: session.exercises });
    } catch (error) {
      console.error('Failed to start workout:', error);
    }
  };

  const handleCompleteWorkout = () => {
    setActiveSession(null);
    loadData(); // Refresh data
  };

  // Show active workout if session is active
  if (activeSession) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <ActiveWorkout
          sessionId={activeSession.id}
          exercises={activeSession.exercises}
          onComplete={handleCompleteWorkout}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workouts</h1>
          <p className="text-muted-foreground">Track your fitness journey and progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="default">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule
          </Button>
          <Button size="default" onClick={() => handleStartWorkout()}>
            <Plus className="mr-2 h-4 w-4" />
            Start Workout
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-1.5 sm:gap-2 md:gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Workouts</CardTitle>
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalWorkouts}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">This Week</CardTitle>
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.thisWeek}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Workouts completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Volume</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalVolume.toLocaleString()} kg</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Personal Records</CardTitle>
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.personalRecords}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="routines">Routines</TabsTrigger>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Workouts */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Recent Workouts</CardTitle>
                <CardDescription>Your latest training sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-center text-muted-foreground py-4">Loading...</div>
                ) : recentWorkouts.length > 0 ? (
                  recentWorkouts.map(workout => (
                    <div key={workout.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{workout.name}</span>
                          {workout.prs > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {workout.prs} PR{workout.prs > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(workout.date), { addSuffix: true })}</span>
                          <span>{workout.duration} min</span>
                          <span>{workout.sets} sets</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">No recent workouts</div>
                )}
                <Button variant="outline" className="w-full">
                  View All Workouts
                </Button>
              </CardContent>
            </Card>

            {/* Quick Start */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Quick Start</CardTitle>
                <CardDescription>Jump into your workout</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => handleStartWorkout()}
                  >
                    <Dumbbell className="mr-2 h-4 w-4" />
                    Start Empty Workout
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setActiveTab('routines')}
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Start from Routine
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Timer className="mr-2 h-4 w-4" />
                    Quick Timer
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setActiveTab('progress')}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Progress</CardTitle>
              <CardDescription>Your training consistency this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Target: 4 workouts</span>
                  <span className="text-sm text-muted-foreground">2 / 4 completed</span>
                </div>
                <Progress value={50} className="h-2" />
                <div className="grid grid-cols-7 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                    const hasWorkout = weeklyProgress[index]?.hasWorkout || false;
                    return (
                      <div key={day} className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">{day}</div>
                        <div className={`h-8 w-full rounded ${hasWorkout ? 'bg-primary' : 'bg-muted'}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routines Tab */}
        <TabsContent value="routines" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Your Routines</h2>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Routine
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="text-center text-muted-foreground py-4 col-span-3">Loading...</div>
            ) : routines.length > 0 ? (
              routines.map(routine => (
                <Card key={routine.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{routine.name}</CardTitle>
                      <Badge variant="secondary">{routine.folder}</Badge>
                    </div>
                    <CardDescription>
                      {routine.exercises} exercises • Last used {routine.lastUsed}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => handleStartWorkout(routine.id)}>
                        Start
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">Edit</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4 col-span-3">No routines available</div>
            )}
          </div>
        </TabsContent>

        {/* Exercises Tab */}
        <TabsContent value="exercises" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Exercise Library</h2>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Exercise
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {loading ? (
                  <div className="text-center text-muted-foreground py-4">Loading...</div>
                ) : exercises.length > 0 ? (
                  exercises.map(exercise => (
                    <div key={exercise.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{exercise.name}</span>
                          <Badge variant="outline" className="text-xs">{exercise.category}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {exercise.muscle} • Personal Record: {exercise.pr}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">History</Button>
                        <Button size="sm" variant="ghost">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">No exercises available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Volume Progression</CardTitle>
                <CardDescription>Total weight moved over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Charts will be displayed here
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Strength Progress</CardTitle>
                <CardDescription>One rep max estimates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Charts will be displayed here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}