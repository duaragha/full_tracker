"use server"

import { revalidatePath } from "next/cache"
import { addCar, addEntry, updateCar, assignEntryToCar, bulkAssignEntries } from "@/lib/db/phev-store"

export async function addCarAction(name: string) {
  await addCar(name)
  revalidatePath("/phev")
}

export async function addEntryAction(entry: {
  date: string
  cost: number
  km_driven: number
  energy_kwh: number | null
  notes: string
  car_id: number
}) {
  await addEntry(entry)
  revalidatePath("/phev")
}

export async function updateCarDatesAction(
  carId: number,
  startDate: string | null,
  endDate: string | null
) {
  await updateCar(carId, {
    start_date: startDate,
    end_date: endDate
  })
  revalidatePath("/phev")
}

export async function assignEntryAction(entryId: number, carId: number) {
  await assignEntryToCar(entryId, carId)
  revalidatePath("/phev")
}

export async function bulkAssignAction(entryIds: number[], carId: number) {
  await bulkAssignEntries(entryIds, carId)
  revalidatePath("/phev")
}

export async function updateEntryAction(
  id: number,
  entry: {
    date: string
    cost: number
    km_driven: number
    energy_kwh: number | null
    notes: string
    car_id: number | null
  }
) {
  const { updateEntry } = await import("@/lib/db/phev-store")
  await updateEntry(id, entry)
  revalidatePath("/phev")
}

export async function deleteEntryAction(id: number) {
  const { deleteEntry } = await import("@/lib/db/phev-store")
  await deleteEntry(id)
  revalidatePath("/phev")
}
