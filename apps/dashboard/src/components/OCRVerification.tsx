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
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden p-8 space-y-8">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-blueSoft text-brand-blue flex items-center justify-center border border-blue-100">
          <FileText className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-extrabold text-brand-navy tracking-tight">Digitize Referral Document</h2>
      </div>

      {!ocrResult ? (
        <div className="space-y-6">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="w-12 h-12 mb-3 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                  <Upload className="w-5 h-5 text-brand-blue" />
                </div>
                <p className="mb-2 text-sm text-slate-600">
                  <span className="font-bold text-brand-navy">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400 font-medium">PNG, JPG or PDF</p>
              </div>
              <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
            </label>
          </div>

          {file && (
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-sm font-bold text-brand-navy truncate max-w-[200px]">{file.name}</span>
              <button 
                onClick={handleExtract}
                disabled={loading}
                className="px-5 py-2.5 bg-brand-blue hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              >
                {loading ? 'Extracting...' : 'Run OCR Extraction'}
              </button>
            </div>
          )}
          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Document Viewer */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest">Original Document</h3>
            <div className="bg-slate-100 border border-slate-200 rounded-xl overflow-hidden h-[500px] flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt="Document preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-slate-400 text-sm font-medium">No preview available</span>
              )}
            </div>
            <button 
              onClick={() => { setOcrResult(null); setFile(null); setPreviewUrl(null); }}
              className="text-sm font-bold text-slate-500 hover:text-brand-blue transition-colors"
            >
              Upload a different document
            </button>
          </div>

          {/* Verification Form */}
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-800">OCR results are unverified.</h4>
                <p className="text-xs text-amber-700 mt-1 font-medium">
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
                  <div key={field} className={`p-4 rounded-xl border transition-colors ${isUncertain ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200 hover:border-brand-blue/30'}`}>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {field.replace(/_/g, ' ')}
                      {fData.confidence && (
                        <span className={`ml-2 normal-case font-semibold ${isUncertain ? 'text-amber-600' : 'text-emerald-600'}`}>
                          ({(fData.confidence * 100).toFixed(0)}% confidence)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData[field]}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm font-semibold text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                    />
                  </div>
                );
              })}
              
              <div className="pt-4 mt-6 border-t border-slate-100">
                <button 
                  type="submit"
                  className="w-full py-3.5 bg-brand-green hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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
