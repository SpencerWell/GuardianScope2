import { useState } from 'react';
import { ArrowRight, Check, Clock, AlertCircle } from 'lucide-react';
import { getCurrentDateTime } from '../utils/dateUtils'; // 添加这行导入

export default function SubmitRequest() {
  const [currentStep, setCurrentStep] = useState(1);
  const [content, setContent] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState({
    submitted: false,
    operatorsAssigned: 0,
    moderationResults: [],
    finalDecision: null
  });

  const steps = [
    { id: 1, name: 'Submit Content', description: 'Submit content for moderation' },
    { id: 2, name: 'Operator Assignment', description: 'Guardian operators are assigned' },
    { id: 3, name: 'Moderation Process', description: 'Content is being reviewed' },
    { id: 4, name: 'Final Decision', description: 'Consensus reached' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCurrentStep(2);
    
    // Simulate the process
    setTimeout(() => {
      setSubmissionStatus(prev => ({...prev, operatorsAssigned: 3}));
      setCurrentStep(3);
      
      // Simulate operators submitting their decisions
      setTimeout(() => {
        const currentTime = getCurrentDateTime();
        setSubmissionStatus(prev => ({
          ...prev,
          moderationResults: [
            { operator: '0x1234...5678', decision: true, timestamp: currentTime },
            { operator: '0x8765...4321', decision: true, timestamp: currentTime },
            { operator: '0x9876...2468', decision: false, timestamp: currentTime }
          ]
        }));
        
        // Final decision
        setTimeout(() => {
          setCurrentStep(4);
          setSubmissionStatus(prev => ({...prev, finalDecision: true}));
        }, 2000);
      }, 3000);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Submit Moderation Request</h1>

      {/* Progress Steps */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center">
          {steps.map((step, stepIdx) => (
            <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 w-full' : ''}`}>
              {stepIdx !== steps.length - 1 && (
                <div className="absolute top-4 left-7 -ml-px mt-0.5 w-full h-0.5 bg-gray-200" />
              )}
              <div className="group relative flex items-center">
                <span className="flex items-center">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full ${
                    step.id < currentStep ? 'bg-blue-600' 
                    : step.id === currentStep ? 'bg-blue-200'
                    : 'bg-gray-200'
                  }`}>
                    {step.id < currentStep ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-gray-600">{step.id}</span>
                    )}
                  </span>
                  <span className="ml-4 text-sm font-medium text-gray-900">
                    {step.name}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      {/* Content Submission Form */}
      {currentStep === 1 && (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Content to be Moderated
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter the content you want to submit for moderation..."
              required
            />
          </div>
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Submit for Moderation
          </button>
        </form>
      )}

      {/* Operator Assignment Status */}
      {currentStep >= 2 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-medium mb-4">Operator Assignment</h2>
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-blue-500 mr-2" />
            <span>{submissionStatus.operatorsAssigned} operators assigned</span>
          </div>
        </div>
      )}

      {/* Moderation Results */}
      {currentStep >= 3 && submissionStatus.moderationResults.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-medium mb-4">Moderation Results</h2>
          <div className="space-y-4">
            {submissionStatus.moderationResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500">{result.operator}</span>
                </div>
                <div className="flex items-center">
                  {result.decision ? (
                    <Check className="w-5 h-5 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  )}
                  <span className="text-sm text-gray-500">{result.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Decision */}
      {currentStep === 4 && submissionStatus.finalDecision !== null && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Final Decision</h2>
          <div className={`flex items-center ${
            submissionStatus.finalDecision ? 'text-green-600' : 'text-red-600'
          }`}>
            {submissionStatus.finalDecision ? (
              <>
                <Check className="w-6 h-6 mr-2" />
                <span>Content Approved</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 mr-2" />
                <span>Content Rejected</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}