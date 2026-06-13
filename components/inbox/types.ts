export interface Message {
    id: string;
    text: string;
    incoming: boolean;
    timestamp: Date;
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

export interface Conversation {
    id: string;
    contactName: string;
    contactAvatar?: string | null;
    platform: Platform;
    lastMessage: string;
    lastMessageTime: Date;
    unread: boolean;
    closed: boolean;
    assignedTo: string | null;
    tags: string[];
    messages: Message[];
    _postData?: PostData | null;
    pageId?: string;
    contactId?: string | null;
}

export interface ConnectedPage {
    id: string;
    name: string;
    picture?: string;
    platform: "facebook" | "instagram";
    igId?: string;
}

export type Platform = "fb_messenger" | "ig_dm" | "ig_comment" | "fb_comment" | "instagram_comment" | "whatsapp";
export type ChannelFilter = "all" | "messenger" | "instagram" | "fb_comment" | "ig_comment" | "whatsapp";
export type QueueFilter = "all" | "unassigned" | "mine" | "needs_reply" | "done";
