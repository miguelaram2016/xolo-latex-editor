export type Document = {
  id: string;
  title: string;
  content?: string;
  created_at: string;
  updated_at: string;
  project_id?: string;
  projects?: {
    id: string;
    title: string;
  } | null;
};
