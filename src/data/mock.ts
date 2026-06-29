// ============================================================
// TEMPORARY MOCK TYPES - Will be replaced when Milestone 0 contract shapes arrive
// These are the old flat types kept for the mock generator to work
// The new types in types.ts represent the target model
// ============================================================

// Old flat types (internal to mock)
interface Department {
  id: string
  name: string
  code: string
}

interface SectionClass {
  id: string
  departmentId: string
  name: string
  strength: number
  advisor: string
}

interface Student {
  id: string
  roll: number
  sectionId: string
  name: string
}

interface OldAttendanceRecord {
  sectionId: string
  date: string
  absentRolls: number[]
}

// Mulberry32 seeded PRNG for deterministic random numbers
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Global seeded random generator - stable across reloads
const random = mulberry32(42)

// Helper to get random int in range
function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min
}

// Helper to get random float in range
function randomFloat(min: number, max: number): number {
  return random() * (max - min) + min
}

// Helper to shuffle array (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// First names pool
const firstNames = [
  'Aarav', 'Aditi', 'Aditya', 'Akash', 'Amit', 'Ananya', 'Arjun', 'Aryan',
  'Deepak', 'Diya', 'Gaurav', 'Harsh', 'Ishaan', 'Kavya', 'Krishna', 'Lakshmi',
  'Manish', 'Meera', 'Neha', 'Nikhil', 'Pooja', 'Priya', 'Rahul', 'Raj',
  'Riya', 'Rohan', 'Sakshi', 'Sanjay', 'Shreya', 'Siddharth', 'Sneha', 'Suresh',
  'Tanvi', 'Varun', 'Vijay', 'Vikram', 'Yash', 'Aishwarya', 'Bhavesh', 'Chirag',
  'Divya', 'Esha', 'Farhan', 'Gauri', 'Himanshu', 'Isha', 'Jatin', 'Karan',
  'Lavanya', 'Mayank', 'Nisha', 'Omkar', 'Pallavi', 'Pranav', 'Ritika', 'Sahil',
  'Tanya', 'Uday', 'Vivek', 'Yamini', 'Zoya', 'Abhishek', 'Ayesha', 'Chetan',
]

const lastNames = [
  'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Reddy', 'Nair',
  'Iyer', 'Menon', 'Joshi', 'Rao', 'Pillai', 'Desai', 'Shah', 'Mehta',
  'Chopra', 'Malhotra', 'Kapoor', 'Sinha', 'Bose', 'Das', 'Banerjee', 'Mukherjee',
  'Chakraborty', 'Ghosh', 'Sengupta', 'Roy', 'Agarwal', 'Goel', 'Mishra', 'Pandey',
]

const advisorNames = [
  'Dr. Ramesh Kumar', 'Dr. Sunita Sharma', 'Prof. Anil Verma', 'Dr. Meena Patel',
  'Prof. Suresh Reddy', 'Dr. Kavitha Nair', 'Prof. Rajesh Gupta', 'Dr. Lakshmi Iyer',
  'Prof. Vijay Singh', 'Dr. Priya Menon', 'Prof. Harish Rao', 'Dr. Deepa Joshi',
  'Prof. Sanjay Desai', 'Dr. Anita Shah', 'Prof. Mohan Mehta',
]

// Generate departments
export const departments: Department[] = [
  { id: 'ai-ds', name: 'AI & Data Science', code: 'AI&DS' },
  { id: 'cse', name: 'Computer Science', code: 'CSE' },
  { id: 'it', name: 'Information Technology', code: 'IT' },
  { id: 'ece', name: 'Electronics & Communication', code: 'ECE' },
  { id: 'mech', name: 'Mechanical Engineering', code: 'MECH' },
]

// Characteristic mean attendance per department (for realistic spread)
const deptAttendanceMeans: Record<string, number> = {
  'ai-ds': 0.88,
  'cse': 0.84,
  'it': 0.80,
  'ece': 0.76,
  'mech': 0.70,
}

// Generate sections for each department
let advisorIndex = 0
export const sections: SectionClass[] = departments.flatMap((dept) => {
  const sectionCount = dept.id === 'mech' ? 2 : 3 // MECH has 2, others have 3
  const sectionNames = ['A', 'B', 'C'].slice(0, sectionCount)

  return sectionNames.map((name) => ({
    id: `${dept.id}-${name.toLowerCase()}`,
    departmentId: dept.id,
    name,
    strength: randomInt(54, 66),
    advisor: advisorNames[advisorIndex++ % advisorNames.length],
  }))
})

// Generate students for each section
let studentIdCounter = 1
export const students: Student[] = sections.flatMap((section) => {
  const usedNames = new Set<string>()
  return Array.from({ length: section.strength }, (_, i) => {
    let name: string
    do {
      const firstName = firstNames[randomInt(0, firstNames.length - 1)]
      const lastName = lastNames[randomInt(0, lastNames.length - 1)]
      name = `${firstName} ${lastName}`
    } while (usedNames.has(name))
    usedNames.add(name)

    return {
      id: `student-${studentIdCounter++}`,
      roll: i + 1,
      sectionId: section.id,
      name,
    }
  })
})

// Generate working days (skip Sundays) - last ~20 working days ending on fixed "today"
function generateWorkingDays(count: number, endDate: Date): string[] {
  const days: string[] = []
  const current = new Date(endDate)

  while (days.length < count) {
    if (current.getDay() !== 0) {
      // Skip Sundays
      days.unshift(current.toISOString().split('T')[0])
    }
    current.setDate(current.getDate() - 1)
  }

  return days
}

// Fixed "today" for stable mock data
export const TODAY = '2025-01-15'
export const workingDays = generateWorkingDays(20, new Date(TODAY))

// Per-section drift factors (some classes slide below 75 over time)
const sectionDriftFactors: Record<string, number> = {}
sections.forEach((section) => {
  // Some sections have negative drift (getting worse), some positive
  sectionDriftFactors[section.id] = randomFloat(-0.008, 0.005)
})

// Generate attendance records
export const attendanceRecords: OldAttendanceRecord[] = []

sections.forEach((section) => {
  const deptMean = deptAttendanceMeans[section.departmentId]
  // Section-level variance from department mean
  const sectionBaseline = deptMean + randomFloat(-0.08, 0.08)
  const drift = sectionDriftFactors[section.id]

  workingDays.forEach((date, dayIndex) => {
    // Calculate target attendance for this day with drift
    const driftedMean = sectionBaseline + drift * dayIndex
    // Add daily variance
    const dailyVariance = randomFloat(-0.08, 0.08)
    const targetAttendance = Math.max(0.5, Math.min(0.98, driftedMean + dailyVariance))

    // Calculate number of absents
    const absentCount = Math.round(section.strength * (1 - targetAttendance))

    // Select which roll numbers are absent (with some students being chronic absentees)
    const rollNumbers = Array.from({ length: section.strength }, (_, i) => i + 1)

    // Create weighted selection - some students more likely to be absent
    const sectionStudents = students.filter((s) => s.sectionId === section.id)
    const absentProbabilities = sectionStudents.map((s) => {
      // Seed a consistent "truancy factor" per student
      const studentSeed = mulberry32(parseInt(s.id.replace('student-', '')) * 17)()
      return studentSeed < 0.15 ? 3 : studentSeed < 0.3 ? 2 : 1 // 15% chronic, 15% moderate
    })

    // Weighted random selection
    const weightedRolls: number[] = []
    rollNumbers.forEach((roll, i) => {
      for (let j = 0; j < absentProbabilities[i]; j++) {
        weightedRolls.push(roll)
      }
    })

    const selectedAbsents = new Set<number>()
    const shuffledWeighted = shuffle(weightedRolls)
    for (const roll of shuffledWeighted) {
      if (selectedAbsents.size >= absentCount) break
      selectedAbsents.add(roll)
    }

    attendanceRecords.push({
      sectionId: section.id,
      date,
      absentRolls: Array.from(selectedAbsents).sort((a, b) => a - b),
    })
  })
})

// Export type-safe lookup functions
export function getDepartmentById(id: string): Department | undefined {
  return departments.find((d) => d.id === id)
}

export function getSectionById(id: string): SectionClass | undefined {
  return sections.find((s) => s.id === id)
}

export function getStudentById(id: string): Student | undefined {
  return students.find((s) => s.id === id)
}

export function getSectionsByDepartment(deptId: string): SectionClass[] {
  return sections.filter((s) => s.departmentId === deptId)
}

export function getStudentsBySection(sectionId: string): Student[] {
  return students.filter((s) => s.sectionId === sectionId)
}

export function getRecordByDateAndSection(
  sectionId: string,
  date: string
): OldAttendanceRecord | undefined {
  return attendanceRecords.find(
    (r) => r.sectionId === sectionId && r.date === date
  )
}

export function getRecordsBySection(sectionId: string): OldAttendanceRecord[] {
  return attendanceRecords.filter((r) => r.sectionId === sectionId)
}

export function getRecordsByDate(date: string): OldAttendanceRecord[] {
  return attendanceRecords.filter((r) => r.date === date)
}
