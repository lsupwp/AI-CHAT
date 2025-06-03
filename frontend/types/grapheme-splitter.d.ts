declare module 'grapheme-splitter' {
  class GraphemeSplitter {
    constructor();
    splitGraphemes(text: string): string[];
  }
  export = GraphemeSplitter;
}