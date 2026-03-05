import { Suspense } from 'react';
import ChatAIPageView from '@/app/(dashboard)/chat-ai/ChatAIPage';

export default function ChatAIPagePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatAIPageView />
    </Suspense>
  );
}
