import { useState } from 'react';
import { extractOCR } from '../services/api';
import { FileText, AlertTriangle, Upload, CheckCircle } from 'lucide-react';

export function OCRVerification({ onConfirm }: { onConfirm: (data: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  
  // Form state for verification
  const [formData, setFormData] = useState<any>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setOcrResult(null);
      setFormData({});
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await extractOCR(file);
      setOcrResult(result);
      
      // Initialize form data with extracted values
      const initialData: any = {};
      Object.keys(result.fields).forEach(key => {
        initialData[key] = result.fields[key].value || '';
      });
      setFormData(initialData);
    } catch (err: any) {
      setError(err.message || 'Failed to extract OCR data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-700/50 pb-4">
        <FileText className="w-5 h-5 text-blue-400" />
        <h2 className="text-xl font-semibold text-slate-100">Digitize Referral Document</h2>
      </div>

      {!ocrResult ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-600 border-dashed rounded-xl cursor-pointer bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-slate-400" />
                <p className="mb-2 text-sm text-slate-300">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">PNG, JPG or PDF</p>
              </div>
              <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
            </label>
          </div>

          {file && (
            <div className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700">
              <span className="text-sm text-slate-300 truncate max-w-[200px]">{file.name}</span>
              <button 
                onClick={handleExtract}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {loading ? 'Extracting...' : 'Run OCR Extraction'}
              </button>
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Document Viewer */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400">Original Document</h3>
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden h-[500px] flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt="Document preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-slate-500 text-sm">No preview available</span>
              )}
            </div>
            <button 
              onClick={() => { setOcrResult(null); setFile(null); setPreviewUrl(null); }}
              className="text-sm text-slate-400 hover:text-white"
            >
              Upload a different document
            </button>
          </div>

          {/* Verification Form */}
          <div className="space-y-4">
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-orange-400">OCR results are unverified.</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Review against the original document before confirming. Do not rely on OCR output without verification.
                  {ocrResult.is_simulated && " (Running in simulated prototype mode - please enter values manually)."}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.keys(ocrResult.fields).map(field => {
                const fData = ocrResult.fields[field];
                const isUncertain = fData.confidence !== null && fData.confidence < 0.8;
                
                return (
                  <div key={field} className={`p-3 rounded-lg border ${isUncertain ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                      {field.replace(/_/g, ' ')}
                      {fData.confidence && (
                        <span className={`ml-2 normal-case ${isUncertain ? 'text-yellow-400' : 'text-slate-500'}`}>
                          ({(fData.confidence * 100).toFixed(0)}% confidence)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData[field]}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                    />
                  </div>
                );
              })}
              
              <div className="pt-4 border-t border-slate-700/50">
                <button 
                  type="submit"
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Confirm & Verify Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
