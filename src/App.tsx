/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Clock, Target, AlertCircle, CheckCircle, Loader2, Copy, Upload, X, Zap } from "lucide-react";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface ScriptVariation {
  id: number;
  hook: string;
  problem: string;
  solution: string;
  cta: string;
}

export default function App() {
  const [productName, setProductName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [mainProblem, setMainProblem] = useState('');
  const [keyBenefit, setKeyBenefit] = useState('');
  const [toneStyle, setToneStyle] = useState('Energetic');
  const [duration, setDuration] = useState('10');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [variations, setVariations] = useState<ScriptVariation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64Image: string) => {
    setAnalyzing(true);
    setError(null);
    
    const imageData = base64Image.split(',')[1];
    
    const prompt = `Analyze this product image. Extract details for a UGC video script.
    Return a JSON object with:
    - productName: Name/type of product.
    - mainProblem: The specific pain point this product solves.
    - keyBenefit: The primary selling point.
    
    Be concise and marketing-focused.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageData
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              mainProblem: { type: Type.STRING },
              keyBenefit: { type: Type.STRING },
            },
            required: ["productName", "mainProblem", "keyBenefit"]
          }
        }
      });

      const resultText = response.text || "{}";
      try {
        const result = JSON.parse(resultText);
        setProductName(result.productName || '');
        setMainProblem(result.mainProblem || '');
        setKeyBenefit(result.keyBenefit || '');
      } catch (e) {
        console.error("Failed to parse analysis result:", resultText);
        setError("AI returned an invalid format. Please try again or fill manually.");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Failed to analyze image. Please fill details manually.");
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeUrl = async () => {
    if (!productUrl) {
      setError("Please provide a product URL.");
      return;
    }

    setFetchingUrl(true);
    setError(null);

    const prompt = `Analyze the content of this URL: ${productUrl}. Extract details for a UGC video script.
    Return a JSON object with:
    - productName: Name/type of product.
    - mainProblem: The specific pain point this product solves.
    - keyBenefit: The primary selling point.
    
    Be concise and marketing-focused.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ urlContext: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              mainProblem: { type: Type.STRING },
              keyBenefit: { type: Type.STRING },
            },
            required: ["productName", "mainProblem", "keyBenefit"]
          }
        }
      });

      const resultText = response.text || "{}";
      try {
        const result = JSON.parse(resultText);
        setProductName(result.productName || '');
        setMainProblem(result.mainProblem || '');
        setKeyBenefit(result.keyBenefit || '');
      } catch (e) {
        console.error("Failed to parse URL analysis result:", resultText);
        setError("AI failed to extract details from the URL. Please fill manually.");
      }
    } catch (err) {
      console.error("URL Analysis error:", err);
      setError("Failed to analyze URL. Please check the link or fill manually.");
    } finally {
      setFetchingUrl(false);
    }
  };

  const generateScripts = async () => {
    if (!productName || !mainProblem || !keyBenefit) {
      setError("Please provide product details to generate scripts.");
      return;
    }

    setLoading(true);
    setError(null);
    setVariations([]);

    const wordLimit = duration === '10' ? '20' : '30';
    
    const prompt = `Generate 3 professional UGC video scripts for "${productName}".
    ${productUrl ? `Product URL for context: ${productUrl}` : ''}
    Problem: ${mainProblem}
    Benefit: ${keyBenefit}
    Tone: ${toneStyle}
    Duration: ${duration}s (~${wordLimit} words).

    CONTEXT:
    - Automatically determine the most likely target audience.
    - Optimize for high-engagement short-form platforms (TikTok, Reels, Shorts).
    - Structure: Hook → Problem → Solution → CTA.
    - Style: Natural, conversational, creator-led.
    - Ensure each script is distinct and creative.

    STRICT JSON OUTPUT:
    Return an array of 3 objects, each with: id (number), hook (string), problem (string), solution (string), cta (string).`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: productUrl ? [{ urlContext: {} }] : [],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                hook: { type: Type.STRING },
                problem: { type: Type.STRING },
                solution: { type: Type.STRING },
                cta: { type: Type.STRING },
              },
              required: ["id", "hook", "problem", "solution", "cta"]
            }
          }
        }
      });

      const resultText = response.text || "[]";
      try {
        const result = JSON.parse(resultText);
        setVariations(result);
      } catch (e) {
        console.error("Failed to parse generation result:", resultText);
        setError("AI returned an invalid format. Please try again.");
      }
    } catch (err) {
      console.error("Generation error:", err);
      setError("Failed to generate scripts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductName('');
    setProductUrl('');
    setMainProblem('');
    setKeyBenefit('');
    setSelectedImage(null);
    setVariations([]);
    setError(null);
  };

  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copyToClipboard = (text: string, id: number) => {
    if (!navigator.clipboard) {
      // Fallback for non-secure contexts if necessary, though this app should be secure
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-sans selection:bg-indigo-100 relative overflow-x-hidden">
      {/* Professional Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-[120px]" />
      </div>

      {/* Minimal Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter">vidpromt</span>
          </div>
          <div className="flex items-center gap-8">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Professional UGC Engine</span>
            <div className="w-px h-4 bg-gray-200" />
            <button className="text-sm font-semibold hover:text-indigo-600 transition-colors">Support</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-16 relative z-10">
        <div className="grid lg:grid-cols-[420px_1fr] gap-20 items-start">
          
          {/* Controls Section */}
          <section className="space-y-10">
            <div className="space-y-3">
              <h1 className="text-4xl font-extrabold tracking-tight leading-[1.1]">Instant Scripts. <br/><span className="text-indigo-600">Maximum Impact.</span></h1>
              <p className="text-gray-500 text-lg leading-relaxed">The simplest way to generate high-converting UGC content.</p>
            </div>

            <div className="space-y-8">
              {/* Magic Upload */}
              <div className="group">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative h-56 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden ${isDragging ? 'border-indigo-500 bg-indigo-50' : selectedImage ? 'border-indigo-200 bg-indigo-50/20' : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50 shadow-sm'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                  
                  {selectedImage ? (
                    <>
                      <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <p className="text-white text-sm font-bold tracking-wide uppercase">Replace Photo</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
                        className="absolute top-4 right-4 p-2 bg-white/90 rounded-full text-gray-600 hover:text-red-600 shadow-xl"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-8">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm">
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-600" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">Drop Product Photo</p>
                      <p className="text-xs text-gray-400 mt-2 font-medium">AI will handle everything else</p>
                    </div>
                  )}

                  {analyzing && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Analyzing...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Fields */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <Target className="w-3 h-3" /> Product URL (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      placeholder="https://example.com/product"
                      className="flex-1 px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none font-medium text-sm shadow-sm"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                    />
                    <button 
                      onClick={analyzeUrl}
                      disabled={fetchingUrl || !productUrl}
                      className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-2xl transition-all flex items-center justify-center shadow-lg shadow-indigo-600/10"
                      title="Fetch details from URL"
                    >
                      {fetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <Target className="w-3 h-3" /> Product Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="What are we selling?"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none font-medium text-sm shadow-sm"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" /> Main Problem
                  </label>
                  <textarea 
                    placeholder="Describe the pain point this product solves..."
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none font-medium text-sm min-h-[100px] resize-none shadow-sm"
                    value={mainProblem}
                    onChange={(e) => setMainProblem(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" /> Product Solution / Benefit
                  </label>
                  <textarea 
                    placeholder="What's the magic result or key benefit?"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none font-medium text-sm min-h-[100px] resize-none shadow-sm"
                    value={keyBenefit}
                    onChange={(e) => setKeyBenefit(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Tone</label>
                    <select 
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none appearance-none cursor-pointer font-medium text-sm shadow-sm"
                      value={toneStyle}
                      onChange={(e) => setToneStyle(e.target.value)}
                    >
                      <option>Energetic</option>
                      <option>Casual</option>
                      <option>Bold</option>
                      <option>Emotional</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Length</label>
                    <div className="flex bg-gray-50 p-1.5 rounded-2xl shadow-sm">
                      <button 
                        onClick={() => setDuration('10')}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${duration === '10' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        10s
                      </button>
                      <button 
                        onClick={() => setDuration('15')}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${duration === '15' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        15s
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-3">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={generateScripts}
                  disabled={loading || analyzing}
                  className="flex-[2] py-5 bg-black hover:bg-gray-900 disabled:bg-gray-200 text-white font-bold rounded-2xl shadow-2xl shadow-black/10 transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Generate Scripts
                      <Zap className="w-4 h-4 group-hover:scale-125 transition-transform fill-white" />
                    </>
                  )}
                </button>
                <button 
                  onClick={resetForm}
                  disabled={loading || analyzing}
                  className="flex-1 py-5 bg-white border border-gray-200 hover:bg-gray-50 disabled:bg-gray-50 text-gray-500 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  title="Reset Form"
                >
                  <X className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          </section>

          {/* Output Section */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tight">Results</h2>
              <div className="flex items-center gap-4">
                {variations.length > 0 && (
                  <button 
                    onClick={() => {
                      const allText = variations.map((v, i) => `Variation ${i + 1}:\nHook: ${v.hook}\nProblem: ${v.problem}\nSolution: ${v.solution}\nCTA: ${v.cta}`).join('\n\n---\n\n');
                      copyToClipboard(allText, -1); // -1 for "Copy All"
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${copiedId === -1 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                  >
                    {copiedId === -1 ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedId === -1 ? 'All Copied' : 'Copy All'}
                  </button>
                )}
                {variations.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full">
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">3 Variations Ready</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-[600px] bg-white rounded-[2.5rem] border border-gray-100 shadow-sm"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 border-2 border-indigo-50 border-t-indigo-600 rounded-full animate-spin" />
                      <Zap className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-indigo-600" />
                    </div>
                    <p className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-gray-300">Generating...</p>
                  </motion.div>
                ) : variations.length > 0 ? (
                  <div className="grid gap-8">
                    {variations.map((v, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.15, type: "spring", stiffness: 100 }}
                        className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative"
                      >
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-xs font-black text-gray-400">0{idx + 1}</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">UGC Variation</span>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(`Hook: ${v.hook}\nProblem: ${v.problem}\nSolution: ${v.solution}\nCTA: ${v.cta}`, idx)}
                            className={`p-3 rounded-xl transition-all ${copiedId === idx ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            title="Copy Script"
                          >
                            {copiedId === idx ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          </button>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">The Hook</span>
                            <p className="text-lg font-bold leading-snug text-gray-900 italic">"{v.hook}"</p>
                          </div>
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">The Problem</span>
                            <p className="text-base font-medium leading-relaxed text-gray-600">{v.problem}</p>
                          </div>
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">The Solution</span>
                            <p className="text-base font-medium leading-relaxed text-gray-600">{v.solution}</p>
                          </div>
                          <div className="pt-4 border-t border-gray-50">
                            <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Call to Action</span>
                            <p className="text-lg font-black text-indigo-600 mt-1">{v.cta}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-[600px] bg-gray-50/30 rounded-[2.5rem] border border-dashed border-gray-200"
                  >
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                      <Zap className="w-8 h-8 text-gray-200 fill-gray-100" />
                    </div>
                    <p className="text-gray-400 text-sm font-bold">Ready for your next viral hit.</p>
                    <p className="text-gray-300 text-xs mt-2">Upload a photo to begin.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-20 mt-20 relative z-10">
        <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-3 opacity-20 grayscale">
            <Zap className="w-5 h-5 fill-black" />
            <span className="text-lg font-black tracking-tighter">vidpromt</span>
          </div>
          <div className="flex flex-wrap justify-center gap-10 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-black transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-black transition-colors">API Status</a>
            <span className="text-gray-200">© 2024 vidpromt</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
