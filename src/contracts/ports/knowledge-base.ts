export interface KnowledgeBase {
  retrieve(input: {
    query: string;
    topK: number;
  }): Promise<Array<{ id: string; text: string; score: number }>>;
}

