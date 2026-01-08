import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CreateTicketModal } from './Tickets/CreateTicketModal';

export default function FloatingNewTicketButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
        title="Novo Ticket"
      >
        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-200" />
        <span className="font-medium">Novo Ticket</span>
      </button>

      <CreateTicketModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
