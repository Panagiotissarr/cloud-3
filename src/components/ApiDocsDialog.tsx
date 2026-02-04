import { useState } from "react";
import { FileText, Copy, Check, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

const API_DOCS = `# Cloud API Documentation

## Overview
The Cloud API allows you to programmatically manage your data feed. You can add, update, delete, and query data that Cloud can use as context.

## Base URL
\`\`\`
https://fpxtucteydpmuswitebs.supabase.co/functions/v1/api
\`\`\`

## Authentication
All requests require an API key passed in the \`x-api-key\` header.

\`\`\`
x-api-key: your_api_key_here
\`\`\`

---

## Endpoints

### GET /info
Get API information and statistics.

**Response:**
\`\`\`json
{
  "success": true,
  "api_version": "1.0.0",
  "data_items": 5,
  "endpoints": [...]
}
\`\`\`

---

### GET /data
List all your data feed items.

**Response:**
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "My Note",
      "content": "Content here...",
      "metadata": {},
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
\`\`\`

---

### POST /data
Add a new data item to your feed.

**Request Body:**
\`\`\`json
{
  "title": "My New Data",
  "content": "The content you want Cloud to know about",
  "metadata": {
    "category": "notes",
    "tags": ["important", "work"]
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "My New Data",
    "content": "...",
    "metadata": {...},
    "created_at": "..."
  }
}
\`\`\`

---

### PUT /data/:id
Update an existing data item.

**Request Body:**
\`\`\`json
{
  "title": "Updated Title",
  "content": "Updated content"
}
\`\`\`

---

### DELETE /data/:id
Delete a data item.

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Data deleted"
}
\`\`\`

---

### GET /query
Query your data feed. Useful for AI context retrieval.

**Query Parameters:**
- \`q\` - Search term (optional, searches title and content)

**Example:**
\`\`\`
GET /query?q=meeting notes
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "count": 3,
  "formatted": "## Title 1\\nContent...\\n\\n---\\n\\n## Title 2\\nContent...",
  "raw": [...]
}
\`\`\`

The \`formatted\` field provides data in a markdown format ideal for feeding to AI systems.

---

## Example Usage

### cURL
\`\`\`bash
# Add data
curl -X POST "https://fpxtucteydpmuswitebs.supabase.co/functions/v1/api/data" \\
  -H "x-api-key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Meeting Notes", "content": "Discussed Q1 goals..."}'

# Query data
curl "https://fpxtucteydpmuswitebs.supabase.co/functions/v1/api/query?q=meeting" \\
  -H "x-api-key: your_api_key"
\`\`\`

### JavaScript/TypeScript
\`\`\`javascript
const API_KEY = 'your_api_key';
const BASE_URL = 'https://fpxtucteydpmuswitebs.supabase.co/functions/v1/api';

// Add data
const response = await fetch(\`\${BASE_URL}/data\`, {
  method: 'POST',
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Meeting Notes',
    content: 'Discussed Q1 goals and team assignments.',
    metadata: { date: '2024-01-15', attendees: 5 }
  }),
});

const result = await response.json();
console.log(result);
\`\`\`

### Python
\`\`\`python
import requests

API_KEY = 'your_api_key'
BASE_URL = 'https://fpxtucteydpmuswitebs.supabase.co/functions/v1/api'

# Add data
response = requests.post(
    f'{BASE_URL}/data',
    headers={'x-api-key': API_KEY},
    json={
        'title': 'Meeting Notes',
        'content': 'Discussed Q1 goals...',
        'metadata': {'date': '2024-01-15'}
    }
)

print(response.json())
\`\`\`

---

## Error Responses

All errors follow this format:
\`\`\`json
{
  "error": "Error message here"
}
\`\`\`

**Common Status Codes:**
- \`401\` - Missing or invalid API key
- \`400\` - Bad request (missing required fields)
- \`404\` - Endpoint not found
- \`500\` - Server error
`;

interface ApiDocsDialogProps {
  trigger?: React.ReactNode;
}

export function ApiDocsDialog({ trigger }: ApiDocsDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyDocs = async () => {
    try {
      await navigator.clipboard.writeText(API_DOCS);
      setCopied(true);
      toast({
        title: "Docs copied!",
        description: "API documentation has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <FileText className="h-4 w-4" />
      API Docs
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cloud API Documentation
          </DialogTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyDocs}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Docs
              </>
            )}
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-foreground bg-muted/50 p-4 rounded-lg overflow-x-auto">
              {API_DOCS}
            </pre>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
