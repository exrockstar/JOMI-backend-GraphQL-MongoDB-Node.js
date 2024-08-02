export type WistiaReturn = {
  id: number;
  name: string;
  duration: number;
  progress: number;
  status: string;
  created: string;
  updated: string;
  uploaded: string;
  description: string;
  thumbnail: {
    url: string;
    width: number;
    height: number;
  };
  project: {
    id: number;
    name: string;
    hashed_id: string;
  };
  assets: {
    url: string;
    width: number;
    height: number;
    fileSize: number;
    contentType: string;
    type: string;
  }[];
};
