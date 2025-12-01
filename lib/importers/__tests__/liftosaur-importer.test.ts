/**
 * Test file for Liftosaur JSON Importer
 * Imports Liftosaur app's JSON export format
 * Run with: npm test -- liftosaur-importer.test.ts
 */

import { LiftosaurImporter } from '../liftosaur-importer'

describe('Liftosaur JSON Importer', () => {
  let importer: LiftosaurImporter

  beforeEach(() => {
    importer = new LiftosaurImporter()
  })

  describe('Basic import', () => {
    it('should import basic Liftosaur JSON', () => {
      const json = {
        exportedProgram: {
          customExercises: {},
          program: {
            planner: {
              name: 'My Program',
              weeks: [
                {
                  days: [
                    {
                      name: 'Leg Day',
                      exerciseText: 'Squat / 3x5 / 225lb\nLeg Press / 3x8 / 315lb'
                    }
                  ]
                }
              ]
            }
          }
        }
      }

      const result = importer.import(JSON.stringify(json))

      expect(result.success).toBe(true)
      expect(result.programs).toHaveLength(1)
      expect(result.programs[0].name).toBe('My Program')
    })

    it('should import multiple days', () => {
      const json = {
        exportedProgram: {
          customExercises: {},
          program: {
            planner: {
              name: 'Push Pull Legs',
              weeks: [
                {
                  days: [
                    {
                      name: 'Push',
                      exerciseText: 'Bench Press / 3x5 / 185lb'
                    },
                    {
                      name: 'Pull',
                      exerciseText: 'Barbell Row / 3x5 / 225lb'
                    },
                    {
                      name: 'Legs',
                      exerciseText: 'Squat / 3x5 / 225lb'
                    }
                  ]
                }
              ]
            }
          }
        }
      }

      const result = importer.import(JSON.stringify(json))

      expect(result.success).toBe(true)
      expect(result.programs[0].days).toHaveLength(3)
    })
  })

  describe('Custom exercises', () => {
    it('should import custom exercises', () => {
      const json = {
        exportedProgram: {
          customExercises: {
            'custom1': {
              name: 'Machine Leg Press',
              targetMuscleGroups: ['Quadriceps', 'Glutes'],
              equipment: 'Machine'
            }
          },
          program: {
            planner: {
              name: 'Test',
              weeks: [
                {
                  days: [
                    {
                      name: 'Day 1',
                      exerciseText: 'Machine Leg Press / 4x8 / 400lb'
                    }
                  ]
                }
              ]
            }
          }
        }
      }

      const result = importer.import(JSON.stringify(json))

      expect(result.customExercises).toBeDefined()
      expect(result.customExercises.length).toBeGreaterThan(0)
    })
  })

  describe('Multiple weeks', () => {
    it('should handle multiple week cycles', () => {
      const json = {
        exportedProgram: {
          customExercises: {},
          program: {
            planner: {
              name: 'Periodized Program',
              weeks: [
                {
                  days: [
                    {
                      name: 'Day 1',
                      exerciseText: 'Exercise 1 / 3x5 / 100kg'
                    }
                  ]
                },
                {
                  days: [
                    {
                      name: 'Day 1',
                      exerciseText: 'Exercise 1 / 3x3 / 110kg'
                    }
                  ]
                }
              ]
            }
          }
        }
      }

      const result = importer.import(JSON.stringify(json))

      expect(result.success).toBe(true)
      expect(result.programs[0].weeks).toHaveLength(2)
    })
  })

  describe('Exercise parsing from Liftosaur format', () => {
    it('should parse exercises from exerciseText', () => {
      const json = {
        exportedProgram: {
          customExercises: {},
          program: {
            planner: {
              name: 'Test',
              weeks: [
                {
                  days: [
                    {
                      name: 'Day',
                      exerciseText: 'Bench Press / 3x5 / 185lb\nSquat / 3x5 / 225lb'
                    }
                  ]
                }
              ]
            }
          }
        }
      }

      const result = importer.import(JSON.stringify(json))

      expect(result.success).toBe(true)
      expect(result.programs[0].days[0].exercises).toHaveLength(2)
    })
  })

  describe('Unit handling', () => {
    it('should convert lbs to kg if specified', () => {
      const json = {
        exportedProgram: {
          customExercises: {},
          program: {
            planner: {
              name: 'Test',
              weeks: [
                {
                  days: [
                    {
                      name: 'Day',
                      exerciseText: 'Squat / 3x5 / 225lb'
                    }
                  ]
                }
              ]
            }
          }
        }
      }

      const result = importer.import(JSON.stringify(json), { targetUnit: 'kg' })

      expect(result.success).toBe(true)
      const weight = result.programs[0].days[0].exercises[0].weight
      expect(weight).toBeCloseTo(102.06, 1) // 225 * 0.453592
    })
  })

  describe('Error handling', () => {
    it('should handle invalid JSON', () => {
      const result = importer.import('invalid json')

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle missing required fields', () => {
      const json = {
        exportedProgram: {}
      }

      const result = importer.import(JSON.stringify(json))

      expect(result.success).toBe(false)
    })

    it('should handle empty program', () => {
      const json = {
        exportedProgram: {
          customExercises: {},
          program: {
            planner: {
              name: 'Empty',
              weeks: []
            }
          }
        }
      }

      const result = importer.import(JSON.stringify(json))

      expect(result.success).toBe(true)
      expect(result.programs[0].days.length).toBe(0)
    })

    it('should handle missing exerciseText', () => {
      const json = {
        exportedProgram: {
          customExercises: {},
          program: {
            planner: {
              name: 'Test',
              weeks: [
                {
                  days: [
                    {
                      name: 'Day 1'
                      // No exerciseText
                    }
                  ]
                }
              ]
            }
          }
        }
      }

      const result = importer.import(JSON.stringify(json))

      expect(result.success).toBe(true)
      // Should handle gracefully
      expect(result.programs[0].days[0].exercises.length).toBe(0)
    })
  })

  describe('Metadata', () => {
    it('should include import statistics', () => {
      const json = {
        exportedProgram: {
          customExercises: {
            'ex1': { name: 'Custom' }
          },
          program: {
            planner: {
              name: 'Test',
              weeks: [
                {
                  days: [
                    {
                      name: 'Day',
                      exerciseText: 'Squat / 3x5 / 225lb\nBench / 3x5 / 185lb'
                    }
                  ]
                }
              ]
            }
          }
        }
      }

      const result = importer.import(JSON.stringify(json))

      expect(result.stats).toBeDefined()
      expect(result.stats.programsImported).toBe(1)
      expect(result.stats.customExercisesImported).toBe(1)
    })

    it('should include import timestamp', () => {
      const json = {
        exportedProgram: {
          customExercises: {},
          program: {
            planner: {
              name: 'Test',
              weeks: []
            }
          }
        }
      }

      const result = importer.import(JSON.stringify(json))

      expect(result.importedAt).toBeInstanceOf(Date)
    })
  })
})
