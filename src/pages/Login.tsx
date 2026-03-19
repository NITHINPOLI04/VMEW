import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useTemplateStore } from '../stores/templateStore';
import { toast } from 'react-hot-toast';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const navigate = useNavigate();
  const { login, signup } = useAuthStore();
  const fetchInvoices = useInvoiceStore((state) => state.fetchInvoices);
  const fetchInventory = useInventoryStore((state) => state.fetchInventory);
  const fetchTemplateData = useTemplateStore((state) => state.fetchTemplateData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        await signup(email, password);
        toast.success('Account created successfully!');
      } else {
        await login(email, password);
        toast.success('Logged in successfully!');
      }
      const currentYear = new Date().getFullYear();
      const financialYear = new Date().getMonth() >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
      await Promise.all([
        fetchInvoices(financialYear),
        fetchInventory(financialYear),
        fetchTemplateData()
      ]);
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-white bg-none lg:bg-[url('/Login_BG.jpg')] bg-[length:50%_auto] lg:bg-contain bg-no-repeat bg-left flex items-center justify-center lg:justify-end p-4 md:p-8 lg:p-12 relative"
    >
      {/* 3D Flip Card Container */}
      <div
        className="w-full max-w-md h-[550px] lg:mr-24 lg:mx-0 perspective-1000 z-10"
        style={{ perspective: '1000px' }}
      >
        {/* Inner Card representing both sides */}
        <div
          className="relative w-full h-full duration-700 pointer-events-auto"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Front Side: Welcome View */}
          <div
            className="absolute inset-0 w-full h-full bg-[#E8F8F3] rounded-[2rem] shadow-2xl p-8 flex flex-col items-center justify-between"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Top Image Placeholder (approx 50% height, slightly smaller width) */}
            <div className="w-[99%] h-[45%] bg-[#2E7D32]/5 rounded-2xl flex items-center justify-center overflow-hidden border border-[#2E7D32]/10 shadow-inner">
              <img
                src="/VMEW.jpg"
                alt="Company Logo"
                className="w-full h-full object-contain opacity-90"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.currentTarget;
                  target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
                }}
              />
            </div>

            {/* Welcome Text */}
            <div className="text-center mt-4 w-full">
              <h2 className="text-3xl font-extrabold text-[#1B365D] mb-3 font-sans tracking-tight">
                Welcome Back
              </h2>

              <div className="flex flex-col items-center justify-center space-y-3 mb-5 px-4">
                <h3 className="text-lg font-bold text-[#102442] tracking-wider">
                  P SIVA PHANINDRA
                </h3>
                <div className="flex items-center justify-center w-full max-w-[200px] gap-3">
                  <div className="flex-1 h-[2px] bg-[#2E7D32] rounded-full"></div>
                  <p className="text-xs font-bold text-[#5E6E66] tracking-widest whitespace-nowrap">
                    PROPRIETOR
                  </p>
                  <div className="flex-1 h-[2px] bg-[#2E7D32] rounded-full"></div>
                </div>
              </div>
              <p className="text-sm text-[#7A8A82] font-medium mt-1">
                Log in to access your dashboard
              </p>
            </div>

            {/* "Get Started" Trigger Button */}
            <div className="mt-auto mb-3 w-full px-6">
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full p-2 pr-2 pl-6 bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(46,125,50,0.2)] hover:shadow-[#2E7D32]/30 transition-all duration-300 group flex items-center justify-between border border-[#2E7D32]/10"
              >
                <span className="text-[#0F3D2E] font-bold text-[15px]">Get Started</span>
                <div className="w-10 h-10 bg-[#E8F8F3] rounded-full flex items-center justify-center group-hover:bg-[#0F3D2E] transition-colors duration-300">
                  <ArrowRight
                    className={`w-5 h-5 text-[#0F3D2E] group-hover:text-white transition-all duration-300 ${isFlipped ? '' : 'group-hover:translate-x-0.5'}`}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Back Side: Login Form */}
          <div
            className="absolute inset-0 w-full h-full bg-white rounded-[2rem] shadow-2xl p-8 sm:p-10 flex flex-col"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="flex justify-between items-center mb-8">
              <button
                onClick={() => setIsFlipped(false)}
                className="p-2 -ml-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors group"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
              </button>
              <h2 className="text-[28px] font-bold text-[#111827] font-sans tracking-tight">
                Login
              </h2>
              <div className="w-9" /> {/* Spacer for centering */}
            </div>

            <div className="text-center mb-8">
              <p className="text-[15px] text-[#4B5563] leading-relaxed mx-auto max-w-[280px]">
                Hey, Enter your details to Bill like never before
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 flex-1 flex flex-col"
            >
              <div className="relative group">
                {loading ? (
                  <Skeleton className="h-12 w-full rounded-xl mb-4" />
                ) : (
                  <>
                    <label htmlFor="email" className="sr-only">Email Address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="name@company.com"
                      autoComplete="email"
                    />
                  </>
                )}
              </div>

              <div className="relative">
                {loading ? (
                  <Skeleton className="h-12 w-full rounded-xl mb-4" />
                ) : (
                  <>
                    <label htmlFor="password" className="sr-only">Password</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </>
                )}
              </div>

              <div className="flex justify-start pt-1 pb-4">
                <button type="button" className="text-[13px] font-medium text-blue-600 hover:text-blue-700 hover:underline">
                  Having trouble in sign in?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-auto w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[15px] rounded-xl transition-all duration-300 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2"></span>
                    Signing in...
                  </span>
                ) : (
                  <span>Sign in</span>
                )}
              </button>

              <div className="text-center pt-6">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Don't have an account? <span className="text-blue-600 font-bold hover:underline">Request Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;