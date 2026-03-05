import { FunctionDeclaration, Type } from "@google/genai";

export const databaseOperationTool: FunctionDeclaration = {
  name: "database_operation",
  description: "Perform CRUD operations on the database. Use this to create, update, or delete records like customers (pelanggan), products (barang), sales (penjualan), attendance (absensi), etc.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      operation: { 
        type: Type.STRING, 
        enum: ["create", "update", "delete"], 
        description: "The operation to perform: 'create' to add new, 'update' to modify existing, 'delete' to remove." 
      },
      table: { 
        type: Type.STRING, 
        description: "The entity name. Supported: 'pelanggan', 'barang', 'penjualan', 'absensi', 'reimburse', 'petty_cash', 'setoran', 'kategori', 'satuan', 'area', 'cabang', 'users', 'promo'." 
      },
      id: { 
        type: Type.STRING, 
        description: "The unique ID of the record. Required for 'update' and 'delete' operations." 
      },
      data: { 
        type: Type.OBJECT, 
        description: "The data object for 'create' or 'update'. Use camelCase keys matching the database schema (e.g., { nama: 'John', alamat: 'Jl. Merdeka' })." 
      }
    },
    required: ["operation", "table"]
  }
};

export const queryDatabaseTool: FunctionDeclaration = {
  name: "query_database",
  description: "Query or search data from the database. Use this to read information before answering questions about specific data.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      table: { 
        type: Type.STRING, 
        description: "The entity name. Supported: 'pelanggan', 'barang', 'penjualan', 'absensi', 'reimburse', 'petty_cash', 'setoran', 'users', 'stok_pengguna'." 
      },
      searchTerm: { 
        type: Type.STRING, 
        description: "Optional keyword to search within the table data (e.g., a customer name, product code, or date)." 
      },
      limit: {
        type: Type.NUMBER,
        description: "Maximum number of records to return. Default is 10. Max is 50."
      }
    },
    required: ["table"]
  }
};

export const tools = [
  {
    functionDeclarations: [databaseOperationTool, queryDatabaseTool]
  }
];
