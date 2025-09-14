export type AISuggestedFriend = {
  id: string;
  name: string;
};

export type AISuggestedLocation = {
  description: string;
  lat: number;
  lng: number;
  placeId?: string;
};

export type AISuggestion = {
  title: string;
  description?: string;
  startTime?: string; // ISO
  endTime?: string;   // ISO
  friends?: AISuggestedFriend[];
  location?: AISuggestedLocation;
  tags?: string[];
};


