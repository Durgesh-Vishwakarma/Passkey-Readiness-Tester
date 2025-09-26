'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Smartphone, BarChart3, CheckCircle, AlertTriangle, Fingerprint, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WebAuthnDemo } from '@/components/WebAuthnDemo';
import { MetricsDashboard } from '@/components/MetricsDashboard';
import { SecurityAnalysis } from '@/components/SecurityAnalysis';

export default function HomePage() {
  const [activeSection, setActiveSection] = useState<'demo' | 'metrics' | 'security'>('demo');
  const componentsRef = useRef<HTMLDivElement>(null);

  const scrollToComponents = () => {
    componentsRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };
  
  

  const features = [
    {
      icon: Shield,
      title: 'Phishing Resistant',
      description: 'WebAuthn origin binding prevents credential theft'
    },
    {
      icon: Fingerprint,
      title: 'Biometric Ready',
      description: 'Support for Touch ID, Face ID, and Windows Hello'
    },
    {
      icon: Smartphone,
      title: 'Cross-Platform',
      description: 'Works across all modern browsers and devices'
    },
    {
      icon: Lock,
      title: 'Private Key Security',
      description: 'Cryptographic keys never leave the user device'
    }
  ];

  const stats = [
    { label: 'Security Score', value: '95/100', icon: Shield },
    { label: 'Registration Success', value: '97%', icon: CheckCircle },
    { label: 'Fallback Rate', value: '<10%', icon: AlertTriangle },
    { label: 'Response Time', value: '<300ms', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Passkey Readiness
              <span className="block text-blue-200">Integration Tester</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Enterprise-grade WebAuthn implementation with comprehensive security posture analysis. 
              Demonstrate modern passwordless authentication for technical interviews and portfolio projects.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className={`transition-all duration-300 hover:scale-105 cursor-pointer ${
                  activeSection === 'demo' 
                    ? 'bg-yellow-400 text-blue-800 hover:bg-yellow-300 shadow-lg' 
                    : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => {
                  setActiveSection('demo');
                  setTimeout(scrollToComponents, 100);
                }}
              >
                Try Demo
              </Button>
              <Button 
                size="lg" 
                className={`transition-all duration-300 hover:scale-105 cursor-pointer ${
                  activeSection === 'metrics' 
                    ? 'bg-yellow-400 text-blue-800 hover:bg-yellow-300 shadow-lg' 
                    : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => {
                  setActiveSection('metrics');
                  setTimeout(scrollToComponents, 100);
                }}
              >
                View Metrics
              </Button>
              <Button 
                size="lg" 
                className={`transition-all duration-300 hover:scale-105 cursor-pointer ${
                  activeSection === 'security' 
                    ? 'bg-yellow-400 text-blue-800 hover:bg-yellow-300 shadow-lg' 
                    : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => {
                  setActiveSection('security');
                  setTimeout(scrollToComponents, 100);
                }}
              >
                Security Analysis
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center cursor-pointer hover:scale-110 transform transition-transform"
              >
                <div className="flex justify-center mb-2">
                  <stat.icon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why WebAuthn?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              WebAuthn provides the strongest authentication security available today, 
              eliminating password-based attacks and providing seamless user experience.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <Card className="h-full hover:shadow-lg transition-all cursor-pointer hover:scale-105 transform">
                  <CardHeader className="text-center">
                    <feature.icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Sections */}
      <div ref={componentsRef} className="py-16 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <div className="flex justify-center mb-12">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'demo', label: 'Live Demo', icon: Smartphone },
                { key: 'metrics', label: 'Metrics Dashboard', icon: BarChart3 },
                { key: 'security', label: 'Security Analysis', icon: Shield }
              ].map((tab) => (
                <Button
                  key={tab.key}
                  variant={activeSection === tab.key ? 'default' : 'ghost'}
                  onClick={() => {
                    setActiveSection(tab.key as 'demo' | 'metrics' | 'security');
                    setTimeout(scrollToComponents, 100);
                  }}
                  className="flex items-center gap-2"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Content */}
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="min-h-[600px]"
          >
            {activeSection === 'demo' && <WebAuthnDemo />}
            {activeSection === 'metrics' && <MetricsDashboard />}
            {activeSection === 'security' && <SecurityAnalysis />}
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-8 w-8 text-blue-400" />
                <h3 className="text-2xl font-bold">PasskeyAuth</h3>
              </div>
              <p className="text-gray-300 mb-4 max-w-md">
                Enterprise-grade WebAuthn implementation showcasing modern passwordless authentication 
                with comprehensive security analysis and real-time metrics.
              </p>
              <div className="flex gap-4">
                <a href="https://github.com" className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a href="https://linkedin.com" className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="https://twitter.com" className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors cursor-pointer">WebAuthn Guide</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors cursor-pointer">API Documentation</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors cursor-pointer">Implementation Examples</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors cursor-pointer">Security Best Practices</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors cursor-pointer">Browser Compatibility</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors cursor-pointer">About Us</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors cursor-pointer">Careers</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors cursor-pointer">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors cursor-pointer">Terms of Service</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors cursor-pointer">Support</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>© 2025 PasskeyAuth. All rights reserved.</span>
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-green-400" />
                  SOC 2 Compliant
                </span>
              </div>
              
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-blue-500 hover:text-blue-400"
                  onClick={() => window.open('https://webauthn.guide', '_blank')}
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Docs
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => window.open('https://github.com/webauthn', '_blank')}
                >
                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  View Source
                </Button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}