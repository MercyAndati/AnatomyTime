// TypeScript fix for Mongoose 9 compatibility
declare module 'mongoose' {
  interface Document {
    $save: (options?: any) => Promise<this>;
  }
}