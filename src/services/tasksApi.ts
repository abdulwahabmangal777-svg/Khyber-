export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
  parent?: string;
  position?: string;
}

/**
 * Fetch user's Google Task Lists
 */
export async function fetchTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to fetch task lists: ${res.statusText}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Create a new Task List (e.g. "Fleet Operations", "Driver Compliance")
 */
export async function createTaskList(accessToken: string, title: string): Promise<GoogleTaskList> {
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to create task list: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Fetch tasks for a given task list
 */
export async function fetchTasks(
  accessToken: string,
  taskListId: string
): Promise<GoogleTaskItem[]> {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showHidden=true&maxResults=100`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to fetch tasks: ${res.statusText}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Create a new task in a task list
 */
export async function createGoogleTask(
  accessToken: string,
  taskListId: string,
  task: {
    title: string;
    notes?: string;
    due?: string; // RFC 3339 timestamp (e.g. 2026-08-30T12:00:00.000Z)
  }
): Promise<GoogleTaskItem> {
  const bodyPayload: any = {
    title: task.title
  };
  if (task.notes) bodyPayload.notes = task.notes;
  if (task.due) bodyPayload.due = task.due;

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyPayload)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to create task: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Update task status (complete or needsAction)
 */
export async function updateGoogleTaskStatus(
  accessToken: string,
  taskListId: string,
  taskId: string,
  completed: boolean
): Promise<GoogleTaskItem> {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: completed ? 'completed' : 'needsAction'
    })
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to update task status: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Delete a task (destructive operation)
 */
export async function deleteGoogleTask(
  accessToken: string,
  taskListId: string,
  taskId: string
): Promise<void> {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok && res.status !== 204) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to delete task: ${res.statusText}`);
  }
}
