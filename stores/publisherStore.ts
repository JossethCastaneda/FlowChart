"use client";
import { create } from "zustand";

export interface PublisherPost {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  userId?: string | null;
  channels: string[];
  content: string;
  mediaUrls: string[];
  mediaUrl?: string | null;
  type: string;
  hashtags: string[];
  scheduledAt?: string | null;
  publishedAt?: string | null;
  status: string;
  error?: string | null;
  externalIds?: Record<string, string> | null;
  pageName?: string | null;
  pageId?: string | null;
  createdAt: string;
  updatedAt: string;
}

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
};

interface PublisherStore {
  posts: PublisherPost[];
  isLoading: boolean;
  error: string | null;

  fetchPosts: (status?: string) => Promise<void>;
  createPost: (data: Partial<PublisherPost>) => Promise<PublisherPost | null>;
  updatePost: (id: string, data: Partial<PublisherPost>) => Promise<PublisherPost | null>;
  deletePost: (id: string) => Promise<boolean>;
  publishNow: (postId: string) => Promise<{ success: boolean; error?: string }>;
}

export const usePublisherStore = create<PublisherStore>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,

  fetchPosts: async (status?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = status ? `?status=${status}` : "";
      const res = await fetch(`/api/publisher/posts${params}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      const json = (await res.json()) as ApiEnvelope<{ posts?: PublisherPost[] }>;
      set({ posts: json.data?.posts || [], isLoading: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createPost: async (data) => {
    try {
      const res = await fetch("/api/publisher/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = (await res.json()) as ApiEnvelope<unknown>;
        throw new Error(err.error || "Failed to create post");
      }
      const json = (await res.json()) as ApiEnvelope<{ post?: PublisherPost }>;
      const post = json.data?.post;
      if (!post) throw new Error("Failed to create post");
      set((s) => ({ posts: [post, ...s.posts] }));
      return post;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  updatePost: async (id, data) => {
    try {
      const res = await fetch(`/api/publisher/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update post");
      const json = (await res.json()) as ApiEnvelope<{ post?: PublisherPost }>;
      const post = json.data?.post;
      if (!post) throw new Error("Failed to update post");
      set((s) => ({ posts: s.posts.map((p) => (p.id === id ? post : p)) }));
      return post;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  deletePost: async (id) => {
    try {
      const res = await fetch(`/api/publisher/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");
      set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
      return true;
    } catch {
      return false;
    }
  },

  publishNow: async (postId) => {
    try {
      const res = await fetch("/api/publisher/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      // Refresh posts
      get().fetchPosts();
      return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
}));
