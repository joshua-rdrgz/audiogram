import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Circle,
  X,
  Triangle,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AudiogramPoint {
  frequency: number;
  airConduction: number | null;
  boneConduction: number | null;
}

type Ear = 'left' | 'right';

const FREQUENCIES = [125, 250, 500, 1000, 2000, 4000, 8000];
const INTENSITY_RANGE = [10, 120]; // Range from 10 dBHL to 120 dBHL

const AudiogramApp = () => {
  const [leftEarData, setLeftEarData] = useState<AudiogramPoint[]>(
    FREQUENCIES.map((f) => ({
      frequency: f,
      airConduction: null,
      boneConduction: null,
    }))
  );
  const [rightEarData, setRightEarData] = useState<AudiogramPoint[]>(
    FREQUENCIES.map((f) => ({
      frequency: f,
      airConduction: null,
      boneConduction: null,
    }))
  );
  const [selectedEar, setSelectedEar] = useState<Ear>('left');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingAir, setIsDrawingAir] = useState(true); // true for air, false for bone
  const [showHelp, setShowHelp] = useState(false); // State to toggle help modal
  const [showSubmission, setShowSubmission] = useState(false); // State to toggle submission modal
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
    graphWidth: 0,
    leftPadding: 0,
    bottomPadding: 0,
  });

  // Utility function to convert frequency to x-coordinate
  const frequencyToX = useCallback((frequency: number, canvasWidth: number) => {
    const minFrequency = Math.log2(FREQUENCIES[0]);
    const maxFrequency = Math.log2(FREQUENCIES[FREQUENCIES.length - 1]);
    const logFrequency = Math.log2(frequency);
    const normalizedFrequency =
      (logFrequency - minFrequency) / (maxFrequency - minFrequency);
    return canvasWidth * normalizedFrequency;
  }, []);

  // Utility function to convert intensity to y-coordinate
  const intensityToY = useCallback(
    (intensity: number, canvasHeight: number) => {
      const [minIntensity, maxIntensity] = INTENSITY_RANGE;
      const normalizedIntensity =
        (maxIntensity - intensity) / (maxIntensity - minIntensity);
      return canvasHeight * normalizedIntensity;
    },
    []
  );

  // Utility function to convert x-coordinate to frequency
  const xToFrequency = useCallback((x: number, canvasWidth: number) => {
    const minFrequency = Math.log2(FREQUENCIES[0]);
    const maxFrequency = Math.log2(FREQUENCIES[FREQUENCIES.length - 1]);
    const normalizedX = x / canvasWidth;
    const logFrequency =
      minFrequency + normalizedX * (maxFrequency - minFrequency);
    return Math.pow(2, logFrequency);
  }, []);

  // Utility to convert y-coordinate to intensity
  const yToIntensity = useCallback((y: number, canvasHeight: number) => {
    const [minIntensity, maxIntensity] = INTENSITY_RANGE;
    const normalizedY = y / canvasHeight;
    const intensity =
      INTENSITY_RANGE[1] - normalizedY * (maxIntensity - minIntensity);
    return intensity;
  }, []);

  // Function to find nearest frequency
  const findNearestFrequency = (x: number, canvasWidth: number) => {
    const frequency = xToFrequency(x, canvasWidth);
    let closestFrequency = FREQUENCIES[0];
    let minDiff = Math.abs(frequency - closestFrequency);

    for (let i = 1; i < FREQUENCIES.length; i++) {
      const diff = Math.abs(frequency - FREQUENCIES[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrequency = FREQUENCIES[i];
      }
    }
    return closestFrequency;
  };

  const drawAudiogram = useCallback(
    (
      context: CanvasRenderingContext2D,
      canvasWidth: number,
      canvasHeight: number
    ) => {
      // Add padding to accommodate labels
      const leftPadding = 40; // Space for intensity labels
      const bottomPadding = 30; // Space for frequency labels
      const graphWidth = canvasWidth - leftPadding;
      const graphHeight = canvasHeight - bottomPadding;

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw grid first
      context.strokeStyle = 'rgba(150, 150, 150, 0.5)'; // Light gray grid
      context.lineWidth = 0.5;

      // Draw vertical lines for frequencies
      FREQUENCIES.forEach((frequency) => {
        const x = leftPadding + frequencyToX(frequency, graphWidth);
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, graphHeight);
        context.stroke();
      });

      // Draw horizontal lines for intensity
      const [minIntensity, maxIntensity] = INTENSITY_RANGE;
      for (
        let intensity = minIntensity;
        intensity <= maxIntensity;
        intensity += 10
      ) {
        const y = intensityToY(intensity, graphHeight);
        context.beginPath();
        context.moveTo(leftPadding, y);
        context.lineTo(leftPadding + graphWidth, y);
        context.stroke();
      }

      // Draw frequency labels
      context.font = '12px sans-serif';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.textBaseline = 'top';
      FREQUENCIES.forEach((frequency) => {
        const x = leftPadding + frequencyToX(frequency, graphWidth);
        context.fillText(String(frequency), x, graphHeight + 10); // Position labels below the grid
      });

      // Draw intensity labels (on the left side)
      context.textAlign = 'right';
      context.textBaseline = 'middle';
      for (
        let intensity = minIntensity;
        intensity <= maxIntensity;
        intensity += 10
      ) {
        const y = intensityToY(intensity, graphHeight);
        context.fillText(String(intensity), leftPadding - 10, y); // Position labels to the left of the grid
      }

      // IMPORTANT: Increase line width for data points to make them more visible
      context.lineWidth = 2;

      // Function to draw data points with connecting lines
      const drawData = (
        data: AudiogramPoint[],
        ear: Ear,
        drawAir: boolean,
        context: CanvasRenderingContext2D
      ) => {
        // Draw connecting lines first
        context.beginPath();
        context.strokeStyle = ear === 'left' ? '#3b82f6' : '#ef4444'; // Using blue-500 and red-500 colors
        let isFirstPoint = true;

        data.forEach((point) => {
          const intensity = drawAir
            ? point.airConduction
            : point.boneConduction;
          if (intensity !== null) {
            const x = leftPadding + frequencyToX(point.frequency, graphWidth);
            const y = intensityToY(intensity, graphHeight);

            if (isFirstPoint) {
              context.moveTo(x, y);
              isFirstPoint = false;
            } else {
              context.lineTo(x, y);
            }
          }
        });
        context.stroke();
      };

      // Draw data on top of the grid
      // Draw left ear data
      drawData(leftEarData, 'left', true, context);
      drawData(leftEarData, 'left', false, context);

      // Draw right ear data
      drawData(rightEarData, 'right', true, context);
      drawData(rightEarData, 'right', false, context);
    },
    [frequencyToX, intensityToY, leftEarData, rightEarData]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const container = document.getElementById('audiogram-container');
    if (!container) return;

    // Define padding values
    const leftPadding = 40;
    const bottomPadding = 30;

    // Calculate the actual space we need for the graph and legend
    const containerWidth = container.offsetWidth;
    const graphWidth = containerWidth * 0.8; // Use 80% of width for the graph
    const legendWidth = containerWidth * 0.2; // Use 20% for legend
    const containerHeight = 0.7 * containerWidth; // Maintain aspect ratio

    // Set canvas to the full size we need
    canvas.width = graphWidth + legendWidth;
    canvas.height = containerHeight;

    // Store dimensions for overlay positioning
    setCanvasDimensions({
      width: canvas.width,
      height: containerHeight,
      graphWidth: graphWidth,
      leftPadding: leftPadding,
      bottomPadding: bottomPadding,
    });

    // Now draw the audiogram with the correct width parameters
    drawAudiogram(context, graphWidth, containerHeight);
  }, [drawAudiogram]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Define padding values (same as in drawAudiogram)
    const leftPadding = 40;
    const bottomPadding = 30;
    const graphWidth = canvas.width * 0.8 - leftPadding;
    const graphHeight = canvas.height - bottomPadding;

    // Adjust x and y to account for padding
    const adjustedX = x - leftPadding;
    const adjustedY = y;

    if (
      adjustedX < 0 ||
      adjustedX > graphWidth ||
      adjustedY < 0 ||
      adjustedY > graphHeight
    ) {
      return; // Do nothing if click is outside the grid area
    }

    const clickedFrequency = findNearestFrequency(adjustedX, graphWidth);
    const clickedIntensity =
      Math.round(yToIntensity(adjustedY, graphHeight) / 5) * 5; // Round to nearest 5 dB

    if (
      clickedIntensity < INTENSITY_RANGE[0] ||
      clickedIntensity > INTENSITY_RANGE[1]
    ) {
      return; // Do not allow points outside the intensity range.
    }

    const newData =
      selectedEar === 'left' ? [...leftEarData] : [...rightEarData];
    const pointIndex = newData.findIndex(
      (p) => p.frequency === clickedFrequency
    );

    if (pointIndex !== -1) {
      if (isDrawingAir) {
        newData[pointIndex] = {
          ...newData[pointIndex],
          airConduction: clickedIntensity,
        };
      } else {
        newData[pointIndex] = {
          ...newData[pointIndex],
          boneConduction: clickedIntensity,
        };
      }

      if (selectedEar === 'left') {
        setLeftEarData(newData);
      } else {
        setRightEarData(newData);
      }
    }
  };

  const clearData = (ear: Ear) => {
    const newData = FREQUENCIES.map((f) => ({
      frequency: f,
      airConduction: null,
      boneConduction: null,
    }));
    if (ear === 'left') {
      setLeftEarData(newData);
    } else {
      setRightEarData(newData);
    }
  };

  const selectEar = (ear: Ear) => {
    setSelectedEar(ear);
  };

  const selectDrawingMode = (newIsDrawingAir: boolean) => {
    setIsDrawingAir(newIsDrawingAir);
  };

  const submitData = () => {
    if (!patientName.trim()) {
      setSubmissionMessage('Please enter patient name.');
      setSubmissionStatus('error');
      setShowSubmission(true);
      return;
    }
    if (!patientAge.trim() || isNaN(Number(patientAge))) {
      setSubmissionMessage('Please enter a valid age.');
      setSubmissionStatus('error');
      setShowSubmission(true);
      return;
    }

    // Basic data validation: Check if at least some data points are entered
    const hasLeftEarData = leftEarData.some(
      (point) => point.airConduction !== null || point.boneConduction !== null
    );
    const hasRightEarData = rightEarData.some(
      (point) => point.airConduction !== null || point.boneConduction !== null
    );

    if (!hasLeftEarData && !hasRightEarData) {
      setSubmissionMessage('Please enter audiogram data for at least one ear.');
      setSubmissionStatus('error');
      setShowSubmission(true);
      return;
    }

    setSubmissionStatus('submitting');
    setSubmissionMessage('Submitting data...');
    setShowSubmission(true); // Show the submission modal

    // Simulate submission with a timeout
    setTimeout(() => {
      const submissionData = {
        patientName,
        patientAge,
        leftEarData,
        rightEarData,
      };
      console.log('Submitting data:', submissionData);

      // Simulate success or failure
      const success = true; // Change value to test different outcomes
      if (success) {
        setSubmissionStatus('success');
        setSubmissionMessage('Data submitted successfully!');
        // Reset form after successful submission
        setPatientName('');
        setPatientAge('');
        setLeftEarData(
          FREQUENCIES.map((f) => ({
            frequency: f,
            airConduction: null,
            boneConduction: null,
          }))
        );
        setRightEarData(
          FREQUENCIES.map((f) => ({
            frequency: f,
            airConduction: null,
            boneConduction: null,
          }))
        );
        setTimeout(() => {
          setShowSubmission(false); // Hide modal after a delay
          setSubmissionStatus('idle'); // Reset status
          setSubmissionMessage('');
        }, 2000); // 2-second success message
      } else {
        setSubmissionStatus('error');
        setSubmissionMessage('Failed to submit data. Please try again.');
        setTimeout(() => {
          setSubmissionStatus('idle'); // Reset status
          setSubmissionMessage('');
        }, 3000);
      }
    }, 1500); // Simulate a 1.5-second submission process
  };

  return (
    <div className='min-h-screen bg-gray-900 text-white p-4 md:p-8'>
      <div className='max-w-4xl mx-auto space-y-6'>
        <h1 className='text-3xl sm:text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text'>
          Audiogram Viewer
        </h1>

        <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
          <Button
            onClick={() => setShowHelp(true)}
            className='bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600'
          >
            <AlertTriangle className='mr-2 h-4 w-4' />
            Help
          </Button>
          <div className='min-w-64'>
            <Label>Which Ear to Plot?</Label>
            <Select onValueChange={selectEar}>
              <SelectTrigger>
                <SelectValue placeholder='Left Ear' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='left'>Left Ear</SelectItem>
                <SelectItem value='right'>Right Ear</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='min-w-64'>
            <Label>Which Conduction to Plot?</Label>
            <Select
              onValueChange={(value) =>
                selectDrawingMode(value === 'air' ? true : false)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Air Conduction' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='air'>Air Conduction</SelectItem>
                <SelectItem value='bone'>Bone Conduction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-2'>
            <Button
              onClick={() => clearData('left')}
              className='bg-gray-700 hover:bg-blue-600 text-gray-200 border-gray-600'
            >
              Clear Left Ear Data
            </Button>
            <Button
              onClick={() => clearData('right')}
              className='bg-gray-700 hover:bg-red-600 text-gray-200 border-gray-600'
            >
              Clear Right Ear Data
            </Button>
          </div>
        </div>

        <div
          id='audiogram-container'
          className='relative w-full border border-gray-700 rounded-lg overflow-hidden shadow-lg bg-gray-800'
        >
          <div className='relative'>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className='cursor-crosshair'
              aria-label='Audiogram Canvas'
            />

            {/* Only render overlays if canvas dimensions are known */}
            {canvasDimensions.width > 0 && (
              <>
                {/* Overlay icons for left ear air conduction */}
                {leftEarData.map((point, index) => {
                  if (point.airConduction !== null) {
                    // Add leftPadding to x position
                    const x =
                      canvasDimensions.leftPadding +
                      frequencyToX(
                        point.frequency,
                        canvasDimensions.graphWidth -
                          canvasDimensions.leftPadding
                      );
                    const y = intensityToY(
                      point.airConduction,
                      canvasDimensions.height - canvasDimensions.bottomPadding
                    );
                    return (
                      <div
                        key={`left-air-${index}`}
                        className='absolute pointer-events-none'
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <X size={20} className='text-blue-200' />
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Right ear air conduction */}
                {rightEarData.map((point, index) => {
                  if (point.airConduction !== null) {
                    // Add leftPadding to x position
                    const x =
                      canvasDimensions.leftPadding +
                      frequencyToX(
                        point.frequency,
                        canvasDimensions.graphWidth -
                          canvasDimensions.leftPadding
                      );
                    const y = intensityToY(
                      point.airConduction,
                      canvasDimensions.height - canvasDimensions.bottomPadding
                    );
                    return (
                      <div
                        key={`right-air-${index}`}
                        className='absolute pointer-events-none'
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <Circle size={20} className='text-red-200' />
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Left ear bone conduction */}
                {leftEarData.map((point, index) => {
                  if (point.boneConduction !== null) {
                    // Add leftPadding to x position
                    const x =
                      canvasDimensions.leftPadding +
                      frequencyToX(
                        point.frequency,
                        canvasDimensions.graphWidth -
                          canvasDimensions.leftPadding
                      );
                    const y = intensityToY(
                      point.boneConduction,
                      canvasDimensions.height - canvasDimensions.bottomPadding
                    );
                    return (
                      <div
                        key={`left-bone-${index}`}
                        className='absolute pointer-events-none'
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <Triangle
                          style={{ transform: 'rotate(270deg)' }}
                          size={20}
                          className='text-blue-200'
                        />
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Right ear bone conduction */}
                {rightEarData.map((point, index) => {
                  if (point.boneConduction !== null) {
                    // Add leftPadding to x position
                    const x =
                      canvasDimensions.leftPadding +
                      frequencyToX(
                        point.frequency,
                        canvasDimensions.graphWidth -
                          canvasDimensions.leftPadding
                      );
                    const y = intensityToY(
                      point.boneConduction,
                      canvasDimensions.height - canvasDimensions.bottomPadding
                    );
                    return (
                      <div
                        key={`right-bone-${index}`}
                        className='absolute pointer-events-none'
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <Triangle
                          style={{ transform: 'rotate(90deg)' }}
                          size={20}
                          className='text-red-200'
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </>
            )}
          </div>

          {/* Legend with Lucide React icons */}
          {canvasDimensions.width > 0 && (
            <div
              className='absolute text-sm'
              style={{
                top: '20px',
                left: `${canvasDimensions.graphWidth + 20}px`,
              }}
            >
              {/* Left Ear Legend */}
              <div className='text-blue-500 font-semibold mb-2'>Left Ear:</div>
              <div className='flex items-center mb-2'>
                <X size={14} className='text-blue-500 mr-2' />
                <span>Air Conduction</span>
              </div>
              <div className='flex items-center mb-4'>
                <Triangle
                  size={14}
                  className='text-blue-500 mr-2'
                  style={{ transform: 'rotate(270deg)' }}
                />
                <span>Bone Conduction</span>
              </div>

              {/* Right Ear Legend */}
              <div className='text-red-500 font-semibold mb-2'>Right Ear:</div>
              <div className='flex items-center mb-2'>
                <Circle size={14} className='text-red-500 mr-2' />
                <span>Air Conduction</span>
              </div>
              <div className='flex items-center'>
                <Triangle
                  size={14}
                  className='text-red-500 mr-2'
                  style={{ transform: 'rotate(90deg)' }}
                />
                <span>Bone Conduction</span>
              </div>
            </div>
          )}
        </div>

        <div className='flex flex-col sm:flex-row gap-4 w-full'>
          <div className='flex-1 space-y-4'>
            <Label htmlFor='patient-name' className='text-gray-300'>
              Patient Name
            </Label>
            <Input
              id='patient-name'
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder='Enter patient name'
              className='bg-gray-800 text-white border-gray-700'
            />
          </div>
          <div className='flex-1 space-y-4'>
            <Label htmlFor='patient-age' className='text-gray-300'>
              Patient Age
            </Label>
            <Input
              id='patient-age'
              type='number'
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              placeholder='Enter patient age'
              className='bg-gray-800 text-white border-gray-700'
            />
          </div>
        </div>

        <Button
          onClick={submitData}
          className='w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md transition-colors'
        >
          Submit Data
        </Button>

        {/* Help Dialog - Replace the custom modal implementation */}
        <Dialog open={showHelp} onOpenChange={setShowHelp}>
          <DialogContent className='bg-gray-800 text-white border border-gray-700 sm:max-w-lg'>
            <DialogHeader>
              <DialogTitle className='text-xl font-semibold'>
                How to Use the Audiogram Plotter
              </DialogTitle>
            </DialogHeader>
            <div className='space-y-4'>
              <ul className='list-disc list-inside space-y-2'>
                <li>
                  <strong>Select Ear:</strong> Choose &quot;Left Ear&quot;
                  (blue) or &quot;Right Ear&quot; (red) using the buttons.
                </li>
                <li>
                  <strong>Select Mode:</strong> Choose &quot;Air
                  Conduction&quot; or &quot;Bone Conduction.&quot;
                </li>
                <li>
                  <strong>Plot Data:</strong> Click on the graph to plot the
                  patient&apos;s hearing threshold. The X axis represents
                  frequency, and the Y axis represents intensity.
                </li>
                <li>
                  <strong>Air Conduction:</strong>
                  <ul className='list-disc list-inside ml-5'>
                    <li>Left ear: X symbol</li>
                    <li>Right ear: O symbol</li>
                  </ul>
                </li>
                <li>
                  <strong>Bone Conduction:</strong>
                  <ul className='list-disc list-inside ml-5'>
                    <li>Left ear: &gt; symbol</li>
                    <li>Right ear: &lt; symbol</li>
                  </ul>
                </li>
                <li>
                  <strong>Clear Data:</strong> Use the &quot;Clear Data&quot;
                  button to clear the data for the selected ear.
                </li>
                <li>
                  <strong>Submit Data:</strong> Enter the patient&apos;s name
                  and age, then click &quot;Submit Data.&quot;
                </li>
              </ul>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowHelp(false)}
                className='bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full'
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Submission Status Dialog - Replace the custom modal implementation */}
        <Dialog open={showSubmission} onOpenChange={setShowSubmission}>
          <DialogContent
            className={cn(
              'bg-gray-800 text-white border sm:max-w-md',
              submissionStatus === 'success'
                ? 'border-green-600'
                : submissionStatus === 'error'
                ? 'border-red-600'
                : 'border-gray-700'
            )}
          >
            <DialogHeader>
              {submissionStatus === 'submitting' && (
                <DialogTitle className='flex items-center'>
                  <svg
                    className='animate-spin h-5 w-5 mr-3 text-white'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                  Submitting Data
                </DialogTitle>
              )}
              {submissionStatus === 'success' && (
                <DialogTitle className='flex items-center text-green-500'>
                  <CheckCircle className='h-6 w-6 mr-2' />
                  Success!
                </DialogTitle>
              )}
              {submissionStatus === 'error' && (
                <DialogTitle className='flex items-center text-red-500'>
                  <AlertCircle className='h-6 w-6 mr-2' />
                  Error
                </DialogTitle>
              )}
            </DialogHeader>

            <DialogDescription className='text-gray-300'>
              {submissionMessage}
            </DialogDescription>

            {submissionStatus === 'error' && (
              <DialogFooter>
                <Button
                  onClick={() => setShowSubmission(false)}
                  className='bg-gray-700 hover:bg-gray-600 text-gray-200'
                >
                  Close
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AudiogramApp;
