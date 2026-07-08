export interface Message {
    id: string;
    text: string;
    incoming: boolean;
    timestamp: Date;
    status?: "sending" | "sent" | "error";
    errorText?: string;
}

export interface PostComment {
    id: string;
    text: string;
    username: string;
    userId?: string | null;
    avatar?: string | null;
    timestamp: string;
    likes: number;
}

export interface PostData {
    caption: string;
    mediaUrl: string | null;
    mediaType: string;
    permalink: string | null;
    likeCount: number;
    shareCount?: number;
    commentsCount: number;
    comments: PostComment[];
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
}

export interface Conversation {
    id: string;
    contactName: string;
    contactAvatar?: string | null;
    contactId?: string | null;
    platform: Platform;
    lastMessage: string;
    lastMessageTime: Date;
    unread: boolean;
    closed: boolean;
    assignedTo: string | null;
    tags: string[];
    messages: Message[];
    notes: Note[];
    _postData?: PostData | null;
    pageId?: string;
    pageName?: string | null;
    /** Which app/source provided this conversation */
    channelSource?: "facebook_app" | "instagram_app" | "whatsapp" | "db";
    /** ISO string of when conversation was first created */
    createdAt?: string;
}

export interface ConnectedPage {
    id: string;
    name: string;
    picture?: string;
    platform: "facebook" | "instagram";
    igId?: string;
}

/**
 * Platform union — canonical values used throughout the frontend.
 * Note: "instagram_comment" is kept as an alias for API payloads from the
 * conversations route; both map to the same tab/config in the UI.
 */
export type Platform =
  | "fb_messenger"
  | "ig_dm"
  | "ig_comment"
  | "instagram_comment" // API alias — maps to ig_comment in UI
  | "instagram_dm"      // API alias — maps to ig_dm in UI
  | "fb_comment"
  | "whatsapp";

export type ChannelFilter = "all" | "messenger" | "instagram" | "fb_comment" | "ig_comment" | "whatsapp";
export type QueueFilter = "all" | "unassigned" | "mine" | "needs_reply" | "done";

