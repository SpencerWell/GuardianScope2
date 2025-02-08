import { useState } from 'react';
import GuardianDashboard from '../components/GuardianDashboard';
import CreateTaskModal from '../components/CreateTaskModal';
import SubmitRequest from '../components/SubmitRequest';
import { useRouter } from 'next/router';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const { view } = router.query;

  return (
    <div>
      {!view && (
        <>
          <div className="flex justify-end p-4">
            <button
              onClick={() => router.push('/?view=submit')}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Submit New Request
            </button>
          </div>
          <GuardianDashboard onCreateTask={() => setIsModalOpen(true)} />
          <CreateTaskModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)}
            onSubmit={(content) => {
              console.log('Creating task:', content);
            }}
          />
        </>
      )}
      
      {view === 'submit' && <SubmitRequest />}
    </div>
  );
}