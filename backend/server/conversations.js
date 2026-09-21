// This module manages conversation history and task queues for each session.

const MAX_HISTORY_MESSAGES = 10;

// Each session has its own conversation history and task queue. The conversation history is stored in the `conversations` map, and the task queue is stored in the `queues` map. Each session is identified by a unique sessionId.
const conversations = new Map(); // sessionId -> [{ role, text }, ...]

// Each session has its own task queue to ensure that tasks are processed sequentially. The `queues` map stores the processing state and the list of tasks for each session. Each task is an object containing a handler function, a resolve function, and a reject function.
const queues = new Map(); // sessionId -> { processing: boolean, tasks: [] }

function getRecentHistory(sessionId) {
  return conversations.get(sessionId) || [];
}

// Called before enqueueing so the queued generator sees the latest user input. Returns the updated history after adding the new message. The message is an object with a role (either "user" or "assistant") and text.
function addMessage(sessionId, message) {
  const history = getRecentHistory(sessionId);
  const nextHistory = [...history, message].slice(-MAX_HISTORY_MESSAGES);
  conversations.set(sessionId, nextHistory);
  return nextHistory;
}

async function processQueue(sessionId) {
  const entry = queues.get(sessionId);
  if (!entry || entry.processing) return;

  entry.processing = true;

  while (entry.tasks.length > 0) {
    const { handler, resolve, reject } = entry.tasks.shift();
    try {
      const result = await handler();
      resolve(result);
    } catch (err) {
      reject(err);
    }  
  }

  entry.processing = false;
}

// Enqueue a task for a specific session. The task is a function that returns a promise. The task will be executed sequentially with other tasks for the same session. If the session does not exist, it will be created. Returns a promise that resolves or rejects based on the task's outcome.

function enqueue(sessionId, handler) {
  if (!queues.has(sessionId)) {
    queues.set(sessionId, { processing: false, tasks: [] });
  }

  const entry = queues.get(sessionId);

  return new Promise((resolve, reject) => {
    entry.tasks.push({ handler, resolve, reject });
    // kick off processing (fire and forget)
    processQueue(sessionId).catch((err) => console.error("Queue processing error:", err));
  });
}

function clearSession(sessionId) {
  conversations.delete(sessionId);
  queues.delete(sessionId);
}

export { getRecentHistory, addMessage, enqueue, clearSession };
