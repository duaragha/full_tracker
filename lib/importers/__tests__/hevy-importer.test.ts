/**
 * Test file for Hevy CSV Importer
 * Imports Hevy app's CSV export format for workout history
 * Run with: npm test -- hevy-importer.test.ts
 */

import { HevyImporter } from '../hevy-importer'

describe('Hevy CSV Importer', () => {
  let importer: HevyImporter

  beforeEach(() => {
    importer = new HevyImporter()
  })

  describe('Basic import', () => {
    it('should import Hevy CSV format', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Leg Day,2025-01-01 10:00,2025-01-01 10:45,Squat,1,NORMAL,225,5,
Leg Day,2025-01-01 10:00,2025-01-01 10:45,Squat,2,NORMAL,225,5,
Leg Day,2025-01-01 10:00,2025-01-01 10:45,Squat,3,NORMAL,225,5,`

      const result = importer.import(csv)

      expect(result.success).toBe(true)
      expect(result.workouts).toHaveLength(1)
      expect(result.workouts[0].name).toBe('Leg Day')
      expect(result.workouts[0].exercises).toHaveLength(1)
    })

    it('should import multiple exercises in single workout', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Chest Day,2025-01-01 10:00,2025-01-01 11:00,Bench Press,1,NORMAL,185,5,
Chest Day,2025-01-01 10:00,2025-01-01 11:00,Bench Press,2,NORMAL,185,5,
Chest Day,2025-01-01 10:00,2025-01-01 11:00,Incline Dumbbell,1,NORMAL,70,8,
Chest Day,2025-01-01 10:00,2025-01-01 11:00,Incline Dumbbell,2,NORMAL,70,8,`

      const result = importer.import(csv)

      expect(result.success).toBe(true)
      expect(result.workouts[0].exercises).toHaveLength(2)
      expect(result.workouts[0].exercises[0].name).toBe('Bench Press')
      expect(result.workouts[0].exercises[1].name).toBe('Incline Dumbbell')
    })

    it('should import multiple workouts', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Workout 1,2025-01-01 10:00,2025-01-01 11:00,Exercise A,1,NORMAL,100,5,
Workout 2,2025-01-02 10:00,2025-01-02 11:00,Exercise B,1,NORMAL,150,5,`

      const result = importer.import(csv)

      expect(result.success).toBe(true)
      expect(result.workouts).toHaveLength(2)
      expect(result.workouts[0].name).toBe('Workout 1')
      expect(result.workouts[1].name).toBe('Workout 2')
    })
  })

  describe('Set and rep parsing', () => {
    it('should group sets by exercise', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Test,2025-01-01 10:00,2025-01-01 11:00,Squat,1,NORMAL,225,5,
Test,2025-01-01 10:00,2025-01-01 11:00,Squat,2,NORMAL,225,5,
Test,2025-01-01 10:00,2025-01-01 11:00,Squat,3,NORMAL,225,5,`

      const result = importer.import(csv)

      const squat = result.workouts[0].exercises[0]
      expect(squat.sets).toHaveLength(3)
      expect(squat.sets[0].reps).toBe(5)
      expect(squat.sets[0].weight).toBe(225)
    })

    it('should handle RPE values', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Test,2025-01-01 10:00,2025-01-01 11:00,Bench,1,NORMAL,185,5,8
Test,2025-01-01 10:00,2025-01-01 11:00,Bench,2,NORMAL,185,5,8`

      const result = importer.import(csv)

      const bench = result.workouts[0].exercises[0]
      expect(bench.sets[0].rpe).toBe(8)
      expect(bench.sets[1].rpe).toBe(8)
    })

    it('should handle drop sets', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Test,2025-01-01 10:00,2025-01-01 11:00,Bench,1,NORMAL,185,5,
Test,2025-01-01 10:00,2025-01-01 11:00,Bench,2,DROP,135,8,`

      const result = importer.import(csv)

      const bench = result.workouts[0].exercises[0]
      expect(bench.sets[1].type).toBe('DROP')
    })
  })

  describe('Date/time handling', () => {
    it('should parse timestamps correctly', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Test,2025-12-01 14:30,2025-12-01 15:15,Exercise,1,NORMAL,100,5,`

      const result = importer.import(csv)

      expect(result.workouts[0].startTime).toBeDefined()
      expect(result.workouts[0].endTime).toBeDefined()
    })

    it('should calculate duration', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Test,2025-01-01 10:00,2025-01-01 10:45,Exercise,1,NORMAL,100,5,`

      const result = importer.import(csv)

      expect(result.workouts[0].duration).toBe(45)
    })
  })

  describe('Unit handling', () => {
    it('should convert lbs to kg if specified', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Test,2025-01-01 10:00,2025-01-01 11:00,Squat,1,NORMAL,225,5,`

      const result = importer.import(csv, { targetUnit: 'kg' })

      const weight = result.workouts[0].exercises[0].sets[0].weight
      expect(weight).toBeCloseTo(102.06, 1) // 225 * 0.453592
    })
  })

  describe('Personal records', () => {
    it('should detect personal records', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Workout 1,2025-01-01 10:00,2025-01-01 11:00,Bench,1,NORMAL,185,5,
Workout 2,2025-01-02 10:00,2025-01-02 11:00,Bench,1,NORMAL,195,5,`

      const result = importer.import(csv)

      expect(result.personalRecords).toBeDefined()
      expect(result.personalRecords.length).toBeGreaterThan(0)
    })

    it('should track heaviest weight per exercise', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Workout 1,2025-01-01 10:00,2025-01-01 11:00,Bench,1,NORMAL,185,5,
Workout 2,2025-01-02 10:00,2025-01-02 11:00,Bench,1,NORMAL,195,3,`

      const result = importer.import(csv)

      const benchPR = result.personalRecords.find(pr => pr.exerciseName === 'Bench')
      expect(benchPR?.weight).toBe(195)
    })
  })

  describe('Error handling', () => {
    it('should handle missing header', () => {
      const csv = 'invalid data'

      const result = importer.import(csv)

      expect(result.success).toBe(false)
    })

    it('should handle missing required columns', () => {
      const csv = `title,exercise_title
Test,Bench`

      const result = importer.import(csv)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should skip rows with missing data', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Test,2025-01-01 10:00,2025-01-01 11:00,Bench,1,NORMAL,185,5,
Test,2025-01-01 10:00,2025-01-01 11:00,,2,NORMAL,185,5,
Test,2025-01-01 10:00,2025-01-01 11:00,Bench,3,NORMAL,185,5,`

      const result = importer.import(csv)

      expect(result.success).toBe(true)
      // Should have one exercise with 2 valid sets
      expect(result.workouts[0].exercises[0].sets).toHaveLength(2)
    })

    it('should handle invalid dates', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Test,invalid,invalid,Bench,1,NORMAL,185,5,`

      const result = importer.import(csv)

      // Should handle gracefully
      expect(result.workouts.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Metadata', () => {
    it('should include import statistics', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Workout 1,2025-01-01 10:00,2025-01-01 11:00,Bench,1,NORMAL,185,5,
Workout 1,2025-01-01 10:00,2025-01-01 11:00,Bench,2,NORMAL,185,5,
Workout 2,2025-01-02 10:00,2025-01-02 11:00,Squat,1,NORMAL,225,3,`

      const result = importer.import(csv)

      expect(result.stats).toBeDefined()
      expect(result.stats.workoutsImported).toBe(2)
      expect(result.stats.exercisesImported).toBe(2)
      expect(result.stats.setsImported).toBe(3)
    })

    it('should include import timestamp', () => {
      const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_lbs,reps,rpe
Test,2025-01-01 10:00,2025-01-01 11:00,Bench,1,NORMAL,185,5,`

      const result = importer.import(csv)

      expect(result.importedAt).toBeInstanceOf(Date)
    })
  })
})
