import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle,
  Circle,
  HelpCircle,
  Triangle,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const TooltipHelper: React.FC<{
  title: string;
  description: string;
}> = ({ title, description }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-300 transition-colors" />
      </TooltipTrigger>
      <TooltipContent className="bg-gray-800 border-gray-700 text-white max-w-xs p-3 pb-6">
        <p className="font-semibold text-base mb-1">{title}</p>
        <p className="text-xs text-gray-300 text-wrap">{description}</p>
      </TooltipContent>
    </Tooltip>
);

interface AudiogramPoint {
  frequency: number;
  airConduction: number | null;
  boneConduction: number | null;
}

type Ear = 'left' | 'right';

const FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000];
const INTENSITY_RANGE = [-10, 120];
const LEFT_PADDING = 80;
const TOP_PADDING = 80;
const BOTTOM_PADDING = 50;

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
  const [isDrawingAir, setIsDrawingAir] = useState(true);
  const [showSubmission, setShowSubmission] = useState(false);
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

  const frequencyToX = useCallback((frequency: number, canvasWidth: number) => {
    const minFrequency = Math.log2(FREQUENCIES[0]);
    const maxFrequency = Math.log2(FREQUENCIES[FREQUENCIES.length - 1]);
    const logFrequency = Math.log2(frequency);
    const normalizedFrequency =
      (logFrequency - minFrequency) / (maxFrequency - minFrequency);
    return canvasWidth * normalizedFrequency;
  }, []);

  const intensityToY = useCallback(
    (intensity: number, canvasHeight: number) => {
      const [minIntensity, maxIntensity] = INTENSITY_RANGE;
      const normalizedIntensity =
        (intensity - minIntensity) / (maxIntensity - minIntensity);
      return canvasHeight * normalizedIntensity;
    },
    []
  );

  const xToFrequency = useCallback((x: number, canvasWidth: number) => {
    const minFrequency = Math.log2(FREQUENCIES[0]);
    const maxFrequency = Math.log2(FREQUENCIES[FREQUENCIES.length - 1]);
    const normalizedX = x / canvasWidth;
    const logFrequency =
      minFrequency + normalizedX * (maxFrequency - minFrequency);
    return Math.pow(2, logFrequency);
  }, []);

  const yToIntensity = useCallback((y: number, canvasHeight: number) => {
    const [minIntensity, maxIntensity] = INTENSITY_RANGE;
    const normalizedY = y / canvasHeight;
    const intensity =
      minIntensity + normalizedY * (maxIntensity - minIntensity);
    return intensity;
  }, []);

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
      const graphWidth = canvasWidth - LEFT_PADDING;
      const graphHeight = canvasHeight - TOP_PADDING - BOTTOM_PADDING;

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      context.strokeStyle = 'rgba(150, 150, 150, 0.5)';
      context.lineWidth = 0.5;

      FREQUENCIES.forEach((frequency) => {
        const x = LEFT_PADDING + frequencyToX(frequency, graphWidth);
        context.beginPath();
        context.moveTo(x, TOP_PADDING);
        context.lineTo(x, TOP_PADDING + graphHeight);
        context.stroke();
      });

      const [minIntensity, maxIntensity] = INTENSITY_RANGE;
      for (
        let intensity = minIntensity;
        intensity <= maxIntensity;
        intensity += 10
      ) {
        const y = TOP_PADDING + intensityToY(intensity, graphHeight);
        context.beginPath();
        context.moveTo(LEFT_PADDING, y);
        context.lineTo(LEFT_PADDING + graphWidth, y);
        context.stroke();
      }

      context.font = '12px sans-serif';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.textBaseline = 'bottom';
      FREQUENCIES.forEach((frequency) => {
        const x = LEFT_PADDING + frequencyToX(frequency, graphWidth);
        context.fillText(String(frequency), x, TOP_PADDING - 20);
      });

      context.textAlign = 'right';
      context.textBaseline = 'middle';
      for (
        let intensity = minIntensity;
        intensity <= maxIntensity;
        intensity += 10
      ) {
        const y = TOP_PADDING + intensityToY(intensity, graphHeight);
        context.fillText(String(intensity), LEFT_PADDING - 20, y);
      }

      context.font = '16px sans-serif';
      context.textAlign = 'left';
      context.textBaseline = 'top';
      context.fillText('Frequency (Hz)', LEFT_PADDING, TOP_PADDING - 60);

      context.save();
      context.translate(LEFT_PADDING - 60, canvasHeight - BOTTOM_PADDING);
      context.rotate(-Math.PI / 2);
      context.fillText('Volume (dB)', 0, 0);
      context.restore();

      context.lineWidth = 2;

      const drawData = (
        data: AudiogramPoint[],
        ear: Ear,
        drawAir: boolean,
        context: CanvasRenderingContext2D
      ) => {
        context.beginPath();
        context.strokeStyle = ear === 'left' ? '#3b82f6' : '#ef4444';
        let isFirstPoint = true;

        data.forEach((point) => {
          const intensity = drawAir
            ? point.airConduction
            : point.boneConduction;
          if (intensity !== null) {
            const x = LEFT_PADDING + frequencyToX(point.frequency, graphWidth);
            const y = TOP_PADDING + intensityToY(intensity, graphHeight);

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

      drawData(leftEarData, 'left', true, context);
      drawData(leftEarData, 'left', false, context);
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

    const containerWidth = container.offsetWidth;
    const graphWidth = containerWidth * 0.75;
    const legendWidth = containerWidth * 0.25;
    const containerHeight = 0.7 * containerWidth;

    canvas.width = graphWidth + legendWidth;
    canvas.height = containerHeight;

    setCanvasDimensions({
      width: canvas.width,
      height: containerHeight,
      graphWidth: graphWidth,
      leftPadding: LEFT_PADDING,
      bottomPadding: BOTTOM_PADDING,
    });

    drawAudiogram(context, graphWidth, containerHeight);
  }, [drawAudiogram]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const graphWidth = canvas.width * 0.75 - LEFT_PADDING;
    const graphHeight = canvas.height - TOP_PADDING - BOTTOM_PADDING;

    const adjustedX = x - LEFT_PADDING;
    const adjustedY = y - TOP_PADDING;

    if (
      adjustedX < 0 ||
      adjustedX > graphWidth ||
      adjustedY < 0 ||
      adjustedY > graphHeight
    ) {
      return;
    }

    const clickedFrequency = findNearestFrequency(adjustedX, graphWidth);
    const clickedIntensity =
      Math.round(yToIntensity(adjustedY, graphHeight) / 5) * 5;

    if (
      clickedIntensity < INTENSITY_RANGE[0] ||
      clickedIntensity > INTENSITY_RANGE[1]
    ) {
      return;
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
    setShowSubmission(true);

    setTimeout(() => {
      const submissionData = {
        patientName,
        patientAge,
        leftEarData,
        rightEarData,
      };
      console.log('Submitting data:', submissionData);

      const success = true;
      if (success) {
        setSubmissionStatus('success');
        setSubmissionMessage('Data submitted successfully!');
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
          setShowSubmission(false);
          setSubmissionStatus('idle');
          setSubmissionMessage('');
        }, 2000);
      } else {
        setSubmissionStatus('error');
        setSubmissionMessage('Failed to submit data. Please try again.');
        setTimeout(() => {
          setSubmissionStatus('idle');
          setSubmissionMessage('');
        }, 3000);
      }
    }, 1500);
  };

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 md:p-8"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.h1
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text pb-2"
          >
            Audiogram Viewer
          </motion.h1>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 w-full bg-gray-800/50 p-4 rounded-lg shadow-lg"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="patient-name" className="text-gray-200">
                  Patient Name
                </Label>
                <TooltipHelper 
                  title='Patient Identification' 
                  description='Enter the full name of the patient for record-keeping.' 
                />
              </div>
              <Input
                id="patient-name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Enter patient name"
                className="bg-gray-700 text-white border-gray-600 focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="patient-age" className="text-gray-200">
                  Patient Age
                </Label>
                <TooltipHelper 
                  title='Age Information' 
                  description={`Enter the patient's age in years.`} 
                />
              </div>
              <Input
                id="patient-age"
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="Enter patient age"
                className="bg-gray-700 text-white border-gray-600 focus:border-blue-500 transition-colors"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-gray-800/50 p-4 rounded-lg shadow-lg"
          >
            <div className="min-w-64 space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-gray-200">Ear Selection</Label>
                <TooltipHelper
                  title='Choose Ear to Plot'
                  description='Select which ear to record data for (Left: Blue, Right: Red).'
                />
              </div>
              <Select onValueChange={selectEar}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Left Ear" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 text-white border-gray-600">
                  <SelectItem value="left">Left Ear</SelectItem>
                  <SelectItem value="right">Right Ear</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-64 space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-gray-200">Conduction Type</Label>
                <TooltipHelper
                  title='Select Measurement Type'
                  description='Choose between Air (X/O) or Bone (>/<) conduction.'
                />
              </div>
              <Select
                onValueChange={(value) =>
                  selectDrawingMode(value === 'air' ? true : false)
                }
              >
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Air Conduction" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 text-white border-gray-600">
                  <SelectItem value="air">Air Conduction</SelectItem>
                  <SelectItem value="bone">Bone Conduction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-gray-200">Clear Data</Label>
                <TooltipHelper
                  title='Reset Measurements'
                  description='Clear all data points for the selected ear.'
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => clearData('left')}
                  className="bg-gray-700 hover:bg-blue-600 text-gray-200 border-gray-600 transition-colors"
                >
                  Left Ear
                </Button>
                <Button
                  onClick={() => clearData('right')}
                  className="bg-gray-700 hover:bg-red-600 text-gray-200 border-gray-600 transition-colors"
                >
                  Right Ear
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.3 }}
            id="audiogram-container"
            className="relative w-full rounded-lg overflow-hidden shadow-xl"
          >
            <div
              className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm"
            >
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="cursor-crosshair"
                aria-label="Audiogram Canvas"
              />

              {canvasDimensions.width > 0 && (
                <>
                  {leftEarData.map((point, index) => {
                    if (point.airConduction !== null) {
                      const x =
                        canvasDimensions.leftPadding +
                        frequencyToX(
                          point.frequency,
                          canvasDimensions.graphWidth -
                            canvasDimensions.leftPadding
                        );
                      const y =
                        TOP_PADDING +
                        intensityToY(
                          point.airConduction,
                          canvasDimensions.height -
                            canvasDimensions.bottomPadding -
                            TOP_PADDING
                        );
                      return (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          key={`left-air-${index}`}
                          className="absolute pointer-events-none translate-x-[-50%] translate-y-[-50%] transform"
                          style={{
                            left: `${x}px`,
                            top: `${y}px`,
                          }}
                        >
                          <X size={20} className="text-blue-200" />
                        </motion.div>
                      );
                    }
                    return null;
                  })}

                  {rightEarData.map((point, index) => {
                    if (point.airConduction !== null) {
                      const x =
                        canvasDimensions.leftPadding +
                        frequencyToX(
                          point.frequency,
                          canvasDimensions.graphWidth -
                            canvasDimensions.leftPadding
                        );
                      const y =
                        TOP_PADDING +
                        intensityToY(
                          point.airConduction,
                          canvasDimensions.height -
                            canvasDimensions.bottomPadding -
                            TOP_PADDING
                        );
                      return (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          key={`right-air-${index}`}
                          className="absolute pointer-events-none translate-x-[-50%] translate-y-[-50%] transform"
                          style={{
                            left: `${x}px`,
                            top: `${y}px`,
                          }}
                        >
                          <Circle size={20} className="text-red-200" />
                        </motion.div>
                      );
                    }
                    return null;
                  })}

                  {leftEarData.map((point, index) => {
                    if (point.boneConduction !== null) {
                      const x =
                        canvasDimensions.leftPadding +
                        frequencyToX(
                          point.frequency,
                          canvasDimensions.graphWidth -
                            canvasDimensions.leftPadding
                        );
                      const y =
                        TOP_PADDING +
                        intensityToY(
                          point.boneConduction,
                          canvasDimensions.height -
                            canvasDimensions.bottomPadding -
                            TOP_PADDING
                        );
                      return (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          key={`left-bone-${index}`}
                          className="absolute pointer-events-none translate-x-[-50%] translate-y-[-50%] transform"
                          style={{
                            left: `${x}px`,
                            top: `${y}px`,
                          }}
                        >
                          <Triangle
                            style={{ transform: 'rotate(270deg)' }}
                            size={20}
                            className="text-blue-200"
                          />
                        </motion.div>
                      );
                    }
                    return null;
                  })}

                  {rightEarData.map((point, index) => {
                    if (point.boneConduction !== null) {
                      const x =
                        canvasDimensions.leftPadding +
                        frequencyToX(
                          point.frequency,
                          canvasDimensions.graphWidth -
                            canvasDimensions.leftPadding
                        );
                      const y =
                        TOP_PADDING +
                        intensityToY(
                          point.boneConduction,
                          canvasDimensions.height -
                            canvasDimensions.bottomPadding -
                            TOP_PADDING
                        );
                      return (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          key={`right-bone-${index}`}
                          className="absolute pointer-events-none translate-x-[-50%] translate-y-[-50%] transform"
                          style={{
                            left: `${x}px`,
                            top: `${y}px`,
                          }}
                        >
                          <Triangle
                            style={{ transform: 'rotate(90deg)' }}
                            size={20}
                            className="text-red-200"
                          />
                        </motion.div>
                      );
                    }
                    return null;
                  })}
                </>
              )}
            </div>

            {canvasDimensions.width > 0 && (
              <div
                className="absolute text-sm p-4 bg-gray-800/50 rounded-lg"
                style={{
                  top: '20px',
                  left: `${canvasDimensions.graphWidth + 40}px`,
                }}
              >
                <div className="text-blue-500 font-semibold mb-2">Left Ear:</div>
                <div className="flex items-center mb-2">
                  <X size={14} className="text-blue-500 mr-2" />
                  <span>Air Conduction</span>
                </div>
                <div className="flex items-center mb-4">
                  <Triangle
                    size={14}
                    className="text-blue-500 mr-2"
                    style={{ transform: 'rotate(270deg)' }}
                  />
                  <span>Bone Conduction</span>
                </div>

                <div className="text-red-500 font-semibold mb-2">Right Ear:</div>
                <div className="flex items-center mb-2">
                  <Circle size={14} className="text-red-500 mr-2" />
                  <span>Air Conduction</span>
                </div>
                <div className="flex items-center">
                  <Triangle
                    size={14}
                    className="text-red-500 mr-2"
                    style={{ transform: 'rotate(90deg)' }}
                  />
                  <span>Bone Conduction</span>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.4 }}
            className="flex justify-center"
          >
            <Button
              onClick={submitData}
              className="w-full max-w-md bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-md transition-all shadow-md"
            >
              Submit Data
            </Button>
          </motion.div>

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
                  <DialogTitle className="flex items-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-3 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting Data
                  </DialogTitle>
                )}
                {submissionStatus === 'success' && (
                  <DialogTitle className="flex items-center text-green-500">
                    <CheckCircle className="h-6 w-6 mr-2" />
                    Success!
                  </DialogTitle>
                )}
                {submissionStatus === 'error' && (
                  <DialogTitle className="flex items-center text-red-500">
                    <AlertCircle className="h-6 w-6 mr-2" />
                    Error
                  </DialogTitle>
                )}
              </DialogHeader>

              <DialogDescription className="text-gray-300">
                {submissionMessage}
              </DialogDescription>

              {submissionStatus === 'error' && (
                <DialogFooter>
                  <Button
                    onClick={() => setShowSubmission(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    Close
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

export default AudiogramApp;
