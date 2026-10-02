export interface ChatSpace {
  name: string; // "spaces/XXXXXXXX"
  displayName?: string;
  spaceType?: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  type?: string;
  singleUserBotDm?: boolean;
}

export interface ChatSender {
  name: string; // "users/XXXXX"
  displayName?: string;
  avatarUrl?: string;
  type?: 'HUMAN' | 'BOT';
}

export interface ChatMessage {
  name: string; // "spaces/XXXXX/messages/YYYYY"
  text?: string;
  formattedText?: string;
  createTime: string;
  sender?: ChatSender;
}

/**
 * List all Google Chat spaces accessible to the user
 */
export async function fetchChatSpaces(accessToken: string): Promise<ChatSpace[]> {
  const res = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=100', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to fetch Google Chat spaces: ${res.statusText}`);
  }

  const data = await res.json();
  return data.spaces || [];
}

/**
 * Create a new Chat Space (e.g. "Fleet Logistics Central", "Driver Assistance")
 */
export async function createChatSpace(
  accessToken: string,
  displayName: string
): Promise<ChatSpace> {
  const res = await fetch('https://chat.googleapis.com/v1/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      spaceType: 'SPACE',
      displayName
    })
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to create Chat space: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * List messages in a specific space
 */
export async function fetchChatMessages(
  accessToken: string,
  spaceName: string
): Promise<ChatMessage[]> {
  // spaceName format: "spaces/XXXXXXXX"
  const cleanSpace = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
  const res = await fetch(`https://chat.googleapis.com/v1/${cleanSpace}/messages?pageSize=50`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to fetch messages: ${res.statusText}`);
  }

  const data = await res.json();
  const messages: ChatMessage[] = data.messages || [];
  // Sort chronologically ascending
  return messages.sort(
    (a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
  );
}

/**
 * Send a message into a Chat space
 */
export async function sendChatMessage(
  accessToken: string,
  spaceName: string,
  text: string
): Promise<ChatMessage> {
  const cleanSpace = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
  const res = await fetch(`https://chat.googleapis.com/v1/${cleanSpace}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to send Chat message: ${res.statusText}`);
  }

  return await res.json();
}
