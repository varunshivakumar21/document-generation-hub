import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Plus, Trash2, ArrowLeft } from "lucide-react";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(200),
  description: z.string().trim().max(1000).optional(),
  file: z.instanceof(File).refine(
    (file) => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'].includes(file.type),
    "File must be Word (.docx, .doc) or Excel (.xlsx, .xls)"
  ).refine(
    (file) => file.size <= 10 * 1024 * 1024,
    "File size must be less than 10MB"
  ),
});

const parameterSchema = z.object({
  parameter_name: z.string().trim().min(1, "Parameter name is required").max(100).regex(/^[a-zA-Z0-9_]+$/, "Only alphanumeric and underscore allowed"),
  parameter_label: z.string().trim().min(1, "Parameter label is required").max(200),
  parameter_type: z.enum(['text', 'number', 'email', 'date', 'textarea']),
  is_required: z.boolean(),
  default_value: z.string().trim().max(500).optional(),
});

interface TemplateParameter {
  parameter_name: string;
  parameter_label: string;
  parameter_type: string;
  is_required: boolean;
  default_value: string;
}

export default function TemplateManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Template form state
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Parameters state
  const [parameters, setParameters] = useState<TemplateParameter[]>([]);
  const [showParameterForm, setShowParameterForm] = useState(false);
  
  // New parameter form
  const [newParam, setNewParam] = useState<TemplateParameter>({
    parameter_name: "",
    parameter_label: "",
    parameter_type: "text",
    is_required: true,
    default_value: "",
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
    } catch (error) {
      console.error("Error checking user:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const addParameter = () => {
    try {
      parameterSchema.parse(newParam);
      
      // Check for duplicate parameter names
      if (parameters.some(p => p.parameter_name === newParam.parameter_name)) {
        toast({
          title: "Error",
          description: "Parameter name already exists",
          variant: "destructive",
        });
        return;
      }
      
      setParameters([...parameters, { ...newParam }]);
      setNewParam({
        parameter_name: "",
        parameter_label: "",
        parameter_type: "text",
        is_required: true,
        default_value: "",
      });
      setShowParameterForm(false);
      
      toast({
        title: "Success",
        description: "Parameter added successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedFile) return;
    
    try {
      // Validate template data
      templateSchema.parse({
        name: templateName,
        description: templateDescription,
        file: selectedFile,
      });
      
      if (parameters.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one parameter",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);

      // Get file extension
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('document-templates')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create template record
      const { data: template, error: templateError } = await supabase
        .from('document_templates')
        .insert({
          name: templateName,
          description: templateDescription,
          file_type: fileExt,
          file_url: fileName,
          created_by: user.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Insert parameters
      const { error: paramsError } = await supabase
        .from('template_parameters')
        .insert(
          parameters.map(param => ({
            template_id: template.id,
            ...param,
          }))
        );

      if (paramsError) throw paramsError;

      toast({
        title: "Success",
        description: "Template uploaded successfully",
      });

      // Reset form
      setTemplateName("");
      setTemplateDescription("");
      setSelectedFile(null);
      setParameters([]);
      
      // Navigate to dashboard
      navigate("/dashboard");

    } catch (error: any) {
      console.error("Error uploading template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload template",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Upload New Template
            </CardTitle>
            <CardDescription>
              Upload a Word or Excel template and define the parameters that users will fill
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Template Details */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="templateName">Template Name *</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., FEMA Declaration"
                    required
                    maxLength={200}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Brief description of the template"
                    maxLength={1000}
                  />
                </div>

                <div>
                  <Label htmlFor="file">Template File *</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="file"
                      type="file"
                      accept=".doc,.docx,.xls,.xlsx"
                      onChange={handleFileChange}
                      required
                    />
                    {selectedFile && (
                      <Upload className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supported formats: .doc, .docx, .xls, .xlsx (Max 10MB)
                  </p>
                </div>
              </div>

              {/* Parameters Section */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Parameters</h3>
                  <Button
                    type="button"
                    onClick={() => setShowParameterForm(!showParameterForm)}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </div>

                {/* Parameter List */}
                {parameters.length > 0 && (
                  <div className="space-y-2">
                    {parameters.map((param, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{param.parameter_label}</p>
                          <p className="text-sm text-muted-foreground">
                            {param.parameter_name} ({param.parameter_type})
                            {param.is_required && <span className="text-destructive"> *</span>}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParameter(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New Parameter Form */}
                {showParameterForm && (
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="paramName">Parameter Name *</Label>
                          <Input
                            id="paramName"
                            value={newParam.parameter_name}
                            onChange={(e) =>
                              setNewParam({ ...newParam, parameter_name: e.target.value })
                            }
                            placeholder="e.g., company_name"
                            maxLength={100}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Use in template as: {`{{${newParam.parameter_name || 'parameter_name'}}}`}
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="paramLabel">Display Label *</Label>
                          <Input
                            id="paramLabel"
                            value={newParam.parameter_label}
                            onChange={(e) =>
                              setNewParam({ ...newParam, parameter_label: e.target.value })
                            }
                            placeholder="e.g., Company Name"
                            maxLength={200}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="paramType">Type</Label>
                          <Select
                            value={newParam.parameter_type}
                            onValueChange={(value) =>
                              setNewParam({ ...newParam, parameter_type: value })
                            }
                          >
                            <SelectTrigger id="paramType">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="textarea">Text Area</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="defaultValue">Default Value</Label>
                          <Input
                            id="defaultValue"
                            value={newParam.default_value}
                            onChange={(e) =>
                              setNewParam({ ...newParam, default_value: e.target.value })
                            }
                            placeholder="Optional"
                            maxLength={500}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="required"
                          checked={newParam.is_required}
                          onCheckedChange={(checked) =>
                            setNewParam({ ...newParam, is_required: checked as boolean })
                          }
                        />
                        <Label htmlFor="required" className="cursor-pointer">
                          Required field
                        </Label>
                      </div>

                      <div className="flex gap-2">
                        <Button type="button" onClick={addParameter}>
                          Add Parameter
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowParameterForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={uploading || !selectedFile || parameters.length === 0}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Template
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
