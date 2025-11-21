import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { templateId, parameters } = await req.json();

    if (!templateId || !parameters) {
      throw new Error('Missing required parameters');
    }

    console.log('Generating document for template:', templateId);
    console.log('Parameters:', parameters);

    // Fetch template details
    const { data: template, error: templateError } = await supabaseClient
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    // Fetch template parameters to validate
    const { data: templateParams, error: paramsError } = await supabaseClient
      .from('template_parameters')
      .select('*')
      .eq('template_id', templateId);

    if (paramsError) {
      throw new Error('Failed to fetch template parameters');
    }

    // Validate required parameters
    const requiredParams = templateParams?.filter(p => p.is_required) || [];
    for (const param of requiredParams) {
      if (!parameters[param.parameter_name]) {
        throw new Error(`Missing required parameter: ${param.parameter_label}`);
      }
    }

    // Store the generation request
    const { data: generatedDoc, error: insertError } = await supabaseClient
      .from('generated_documents')
      .insert({
        template_id: templateId,
        user_id: user.id,
        parameters: parameters,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to store document generation request');
    }

    // Download the template file from storage
    const templatePath = template.file_url.replace('document-templates/', '');
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('document-templates')
      .download(templatePath);

    if (downloadError || !fileData) {
      throw new Error('Failed to download template file');
    }

    // Read the file content
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Process the document based on file type
    let processedContent = buffer;
    
    if (template.file_type === 'xlsx' || template.file_type === 'xls') {
      // For Excel files: replace placeholders in cells
      // Note: This is a simplified version. In production, use exceljs library
      const textContent = new TextDecoder().decode(buffer);
      let modifiedContent = textContent;
      
      // Replace placeholders like {{parameter_name}} with actual values
      for (const [key, value] of Object.entries(parameters)) {
        const placeholder = `{{${key}}}`;
        modifiedContent = modifiedContent.split(placeholder).join(String(value));
      }
      
      processedContent = new TextEncoder().encode(modifiedContent);
    } else if (template.file_type === 'docx' || template.file_type === 'doc') {
      // For Word files: replace placeholders in document
      // Note: This is a simplified version. In production, use docxtemplater library
      const textContent = new TextDecoder().decode(buffer);
      let modifiedContent = textContent;
      
      // Replace placeholders like {{parameter_name}} with actual values
      for (const [key, value] of Object.entries(parameters)) {
        const placeholder = `{{${key}}}`;
        modifiedContent = modifiedContent.split(placeholder).join(String(value));
      }
      
      processedContent = new TextEncoder().encode(modifiedContent);
    }

    // Upload the processed document to storage
    const fileName = `${user.id}/${generatedDoc.id}.${template.file_type}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('generated-documents')
      .upload(fileName, processedContent, {
        contentType: template.file_type === 'xlsx' || template.file_type === 'xls' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload processed document');
    }

    // Get a signed URL for download
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from('generated-documents')
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
      throw new Error('Failed to generate download URL');
    }

    // Update the generated document record with the file URL
    const { error: updateError } = await supabaseClient
      .from('generated_documents')
      .update({ file_url: fileName })
      .eq('id', generatedDoc.id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    console.log('Document generated successfully:', generatedDoc.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document generated successfully',
        documentId: generatedDoc.id,
        downloadUrl: signedUrlData.signedUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate document';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
