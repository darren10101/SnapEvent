import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AISuggestion } from "../types/ai";

export type AISuggestionsPopupProps = {
  visible: boolean;
  suggestions: AISuggestion[];
  onClose: () => void;
  onSelect: (s: AISuggestion) => void;
  topOffset?: number;
  isLoading?: boolean;
  error?: string | null;
  aiReasoning?: string | null;
  aiSummary?: string | null;
};

export default function AISuggestionsPopup({ visible, suggestions, onClose, onSelect, topOffset = 130, isLoading = false, error = null, aiReasoning = null, aiSummary = null }: AISuggestionsPopupProps) {
  if (!visible) return null;

  return (
    <View style={{ position: "absolute", top: topOffset, left: 12, right: 12, backgroundColor: "#fff", borderRadius: 12, elevation: 4, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, maxHeight: 380, overflow: "hidden" }}>
      <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#F3F4F6", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>AI Suggestions</Text>
        <Pressable onPress={onClose} hitSlop={8} style={{ padding: 4 }}>
          <Ionicons name="close" size={18} color="#6B7280" />
        </Pressable>
      </View>


      {aiSummary && (
        <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#F9FAFB' }}>
          <Text style={{ color: '#1A237E', fontWeight: 'bold' }}>{aiSummary}</Text>
        </View>
      )}

      {aiReasoning && !aiSummary && (
        <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#F9FAFB' }}>
          <Text style={{ color: '#374151', fontStyle: 'italic' }}>{aiReasoning}</Text>
        </View>
      )}

      {isLoading && !aiSummary ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#6B7280" }}>Generating suggestions...</Text>
        </View>
      ) : error && !aiSummary ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#DC2626" }}>Error: {error}</Text>
        </View>
      ) : suggestions.length === 0 && !aiSummary ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#6B7280" }}>No suggestions yet</Text>
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 340 }}>
          {suggestions.map((s, idx) => (
            <Pressable key={idx} onPress={() => onSelect(s)} style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: "#F3F4F6" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 4 }}>{s.title}</Text>
              {s.description ? <Text style={{ color: "#4B5563", marginBottom: 6 }}>{s.description}</Text> : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {s.startTime ? (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Ionicons name="time" size={14} color="#6B7280" />
                    <Text style={{ marginLeft: 6, color: "#6B7280", fontSize: 12 }}>{new Date(s.startTime).toLocaleString()}</Text>
                  </View>
                ) : null}
                {s.endTime ? (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Ionicons name="flag" size={14} color="#6B7280" />
                    <Text style={{ marginLeft: 6, color: "#6B7280", fontSize: 12 }}>{new Date(s.endTime).toLocaleString()}</Text>
                  </View>
                ) : null}
                {s.location?.description ? (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Ionicons name="location" size={14} color="#6B7280" />
                    <Text style={{ marginLeft: 6, color: "#6B7280", fontSize: 12 }} numberOfLines={1}>
                      {s.location.description}
                    </Text>
                  </View>
                ) : null}
                {Array.isArray(s.friends) && s.friends.length > 0 ? (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Ionicons name="people" size={14} color="#6B7280" />
                    <Text style={{ marginLeft: 6, color: "#6B7280", fontSize: 12 }}>{s.friends.length} friends</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}


