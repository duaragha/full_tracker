"use server"

import { revalidatePath } from "next/cache"
import { addJob, updateJob, deleteJob } from "@/lib/db/jobs-store"
import { Job } from "@/types/job"

export async function addJobAction(job: Omit<Job, 'id' | 'created_at' | 'updated_at'>) {
  await addJob(job)
  revalidatePath("/jobs")
}

export async function updateJobAction(id: number, updates: Partial<Job>) {
  await updateJob(id, updates)
  revalidatePath("/jobs")
}

export async function deleteJobAction(id: number) {
  await deleteJob(id)
  revalidatePath("/jobs")
}
