import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, LogOut, Download, Loader2 } from "lucide-react";
import { z } from "zod";

interface Template {
  id: string;
  name: string;
  description: string | null;
  file_type: string;
}

interface TemplateParameter {
  id: string;
  parameter_name: string;
  parameter_label: string;
  parameter_type: string;
  is_required: boolean;
  default_value: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [parameters, setParameters] = useState<TemplateParameter[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      fetchParameters(selectedTemplate);
    } else {
      setParameters([]);
      setFormValues({});
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchParameters = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from("template_parameters")
        .select("*")
        .eq("template_id", templateId)
        .order("parameter_label");

      if (error) throw error;
      
      const params = data || [];
      setParameters(params);
      
      const initialValues: Record<string, string> = {};
      params.forEach((param) => {
        initialValues[param.parameter_name] = param.default_value || "";
      });
      setFormValues(initialValues);
    } catch (error: any) {
      toast.error("Failed to load template parameters");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const validateParameters = () => {
    const schema = z.record(z.string());
    const requiredParams = parameters.filter(p => p.is_required);
    
    for (const param of requiredParams) {
      const value = formValues[param.parameter_name]?.trim();
      if (!value) {
        toast.error(`${param.parameter_label} is required`);
        return false;
      }
      
      if (param.parameter_type === 'email') {
        const emailSchema = z.string().email();
        if (!emailSchema.safeParse(value).success) {
          toast.error(`${param.parameter_label} must be a valid email`);
          return false;
        }
      }
      
      if (param.parameter_type === 'number') {
        if (isNaN(Number(value))) {
          toast.error(`${param.parameter_label} must be a number`);
          return false;
        }
      }
    }
    
    return true;
  };

  const handleGenerateDocument = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    if (!validateParameters()) {
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-document", {
        body: {
          templateId: selectedTemplate,
          parameters: formValues,
        },
      });

      if (error) throw error;

      if (data?.downloadUrl) {
        toast.success("Document generated successfully!");
        window.open(data.downloadUrl, "_blank");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-secondary">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-elegant">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">DocuFlow</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Generate Document</CardTitle>
              <CardDescription>
                Select a template and fill in the required parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="template">Document Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{template.name}</span>
                          {template.description && (
                            <span className="text-xs text-muted-foreground">
                              {template.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {parameters.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Template Parameters
                  </h3>
                  {parameters.map((param) => (
                    <div key={param.id} className="space-y-2">
                      <Label htmlFor={param.parameter_name}>
                        {param.parameter_label}
                        {param.is_required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <Input
                        id={param.parameter_name}
                        type={param.parameter_type === 'number' ? 'number' : 
                              param.parameter_type === 'date' ? 'date' : 
                              param.parameter_type === 'email' ? 'email' : 'text'}
                        value={formValues[param.parameter_name] || ""}
                        onChange={(e) =>
                          setFormValues({
                            ...formValues,
                            [param.parameter_name]: e.target.value,
                          })
                        }
                        required={param.is_required}
                        placeholder={param.default_value || ""}
                        className="transition-all duration-200 focus:shadow-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleGenerateDocument}
                disabled={!selectedTemplate || generating}
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity shadow-elegant"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Generate PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
