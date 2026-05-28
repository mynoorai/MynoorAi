import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthAPI } from '@/services/api/auth';
import { PageLayout } from '@/components/layout';
import { Button, Text } from '@/components/ui';
import { CheckCircle, XCircle, Mail, ArrowRight, Loader2 } from 'lucide-react';

const VerifyEmailPage = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState<string>('');

  const token = searchParams.get('token');

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async (): Promise<void> => {
    if (!token) {
      setStatus('invalid');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    try {
      const response = await AuthAPI.verifyEmail(token);

      if (response.success) {
        setStatus('success');
        setMessage('Your email has been successfully verified! You can now login to your account.');

        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', {
            state: {
              message: 'Email verified successfully! Please login to continue.',
            },
          });
        }, 3000);
      } else {
        setStatus('error');
        setMessage(response.message || 'Verification failed. The link may have expired.');
      }
    } catch (error: any) {
      setStatus('error');
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else if (error.message) {
        setMessage(error.message);
      } else {
        setMessage('An error occurred during verification. Please try again or contact support.');
      }
    }
  };

  const handleResendVerification = async (): Promise<void> => {
    navigate('/login', {
      state: {
        showResendVerification: true,
      },
    });
  };

  return (
    <PageLayout showDefaultHeader>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {status === 'loading' && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-50 rounded-full mb-6">
                  <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
                </div>
                <Text variant="h2" mb="3">
                  Verifying Your Email
                </Text>
                <Text color="gray">Please wait while we verify your email address...</Text>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-full mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <Text variant="h2" mb="3">
                  Email Verified!
                </Text>
                <Text color="gray" mb="6">
                  {message}
                </Text>
                <div className="space-y-3">
                  <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
                    Go to Login
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Text variant="body-sm" color="gray">
                    Redirecting to login in 3 seconds...
                  </Text>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-6">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <Text variant="h2" mb="3">
                  Verification Failed
                </Text>
                <Text color="gray" mb="6">
                  {message}
                </Text>
                <div className="space-y-3">
                  <Button variant="primary" onClick={handleResendVerification} className="w-full">
                    <Mail className="w-4 h-4 mr-2" />
                    Request New Verification Email
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/signup')} className="w-full">
                    Create New Account
                  </Button>
                </div>
              </div>
            )}

            {status === 'invalid' && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-50 rounded-full mb-6">
                  <Mail className="w-10 h-10 text-yellow-600" />
                </div>
                <Text variant="h2" mb="3">
                  Invalid Verification Link
                </Text>
                <Text color="gray" mb="6">
                  {message}
                </Text>
                <div className="space-y-3">
                  <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
                    Go to Login
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/signup')} className="w-full">
                    Create Account
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Help section */}
          <div className="mt-8 text-center">
            <Text variant="body-sm" color="gray">
              Having trouble? Contact our support team at{' '}
              {/* TODO: confirm legal entity name/domain with product team */}
              <a
                href="mailto:support@mynoorai.com"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                support@mynoorai.com
              </a>
            </Text>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default VerifyEmailPage;
