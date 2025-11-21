import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { FileText, Zap, Shield, CheckCircle, Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-secondary">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-elegant">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">DocuFlow</h1>
          </div>
          <Button onClick={() => navigate("/auth")} variant="outline">
            Sign In
          </Button>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center animate-fade-in">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent border border-accent/20">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Automate Your Documents</span>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold leading-tight">
              Transform Templates Into
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Professional Documents</span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Generate customized PDFs from your Excel and Word templates in seconds. 
              Replace placeholders with dynamic data and download production-ready documents instantly.
            </p>

            <div className="flex items-center justify-center gap-4 pt-4">
              <Button 
                onClick={() => navigate("/auth")}
                size="lg"
                className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-elegant text-lg px-8"
              >
                Get Started Free
              </Button>
              <Button 
                onClick={() => navigate("/auth")}
                size="lg"
                variant="outline"
                className="text-lg px-8"
              >
                View Demo
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-card p-8 rounded-2xl shadow-card space-y-4 hover:shadow-elegant transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold">Template Management</h3>
              <p className="text-muted-foreground">
                Upload and manage your Excel and Word templates with custom parameters and placeholders.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-card space-y-4 hover:shadow-elegant transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold">Dynamic Generation</h3>
              <p className="text-muted-foreground">
                Fill in parameters through an intuitive form and generate PDFs with one click.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-card space-y-4 hover:shadow-elegant transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold">Secure & Reliable</h3>
              <p className="text-muted-foreground">
                Your documents and data are protected with enterprise-grade security and authentication.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20 bg-card/50 backdrop-blur-sm rounded-3xl shadow-card">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h3 className="text-3xl font-bold">How It Works</h3>
              <p className="text-muted-foreground text-lg">
                Generate professional documents in three simple steps
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Select Your Template</h4>
                  <p className="text-muted-foreground">
                    Choose from your library of uploaded Excel or Word templates
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Fill In Parameters</h4>
                  <p className="text-muted-foreground">
                    Enter values for the dynamic fields defined in your template
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Download Your PDF</h4>
                  <p className="text-muted-foreground">
                    Generate and download your customized document instantly
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center pt-8">
              <Button 
                onClick={() => navigate("/auth")}
                size="lg"
                className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-elegant"
              >
                Start Generating Documents
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 DocuFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
