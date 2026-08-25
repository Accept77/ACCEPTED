export type Restaurant = {
  hasVisited: boolean;
  id: string;
  name: string;
  category: string;
  area: string;
  address: string;
  memo: string;
  tags: string[];
  imageUrl: string | null;
  imageUrls: string[];
  imagePath: string | null;
  imagePaths: string[];
  imageSourceUrl: string | null;
  imageCredit: string | null;
  imageCandidates: string[];
  naverUrl: string;
  latitude: number | null;
  longitude: number | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantSummary = {
  id: string;
  name: string;
  category: string;
  area: string;
  address: string;
  memo: string;
  tags: string[];
  hasVisited: boolean;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type RestaurantInput = {
  hasVisited: boolean;
  name: string;
  category: string;
  area: string;
  address: string;
  memo: string;
  tags: string[];
  imagePath: string | null;
  imagePaths: string[];
  imageSourceUrl: string | null;
  imageCredit: string | null;
  imageCandidates: string[];
  /** Temporary trusted Naver thumbnail URL used during a server-side import. */
  imageImportUrl?: string | null;
  naverUrl: string;
  latitude: number | null;
  longitude: number | null;
  sortOrder: number;
  isVisible: boolean;
};

export type NaverPlaceSearchResult = {
  id: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  sourceUrl: string;
  mapUrl: string;
  latitude: number | null;
  longitude: number | null;
};

export type NaverImageCandidate = {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  sourceUrl: string;
  width: number | null;
  height: number | null;
};

export type NaverSavedPlace = {
  id: string;
  name: string;
  category: string;
  area: string;
  address: string;
  memo: string;
  tags: string[];
  imageUrls: string[];
  naverUrl: string;
  latitude: number | null;
  longitude: number | null;
};

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: string;
          name: string;
          category: string;
          area: string;
          address: string;
          memo: string;
          tags: string[];
          has_visited: boolean;
          image_path: string | null;
          image_paths: string[];
          image_source_url: string | null;
          image_credit: string | null;
          image_candidates: string[];
          naver_url: string;
          latitude: number | null;
          longitude: number | null;
          sort_order: number;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string;
          area?: string;
          address?: string;
          memo?: string;
          tags?: string[];
          has_visited?: boolean;
          image_path?: string | null;
          image_paths?: string[];
          image_source_url?: string | null;
          image_credit?: string | null;
          image_candidates?: string[];
          naver_url: string;
          latitude?: number | null;
          longitude?: number | null;
          sort_order?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          area?: string;
          address?: string;
          memo?: string;
          tags?: string[];
          has_visited?: boolean;
          image_path?: string | null;
          image_paths?: string[];
          image_source_url?: string | null;
          image_credit?: string | null;
          image_candidates?: string[];
          naver_url?: string;
          latitude?: number | null;
          longitude?: number | null;
          sort_order?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
