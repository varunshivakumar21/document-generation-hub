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

    // TODO: Implement actual document processing
    // For now, return a success message
    // In a production environment, you would:
    // 1. Download the template file from storage
    // 2. Process it with exceljs/docxtemplater
    // 3. Replace placeholders with parameter values
    // 4. Convert to PDF
    // 5. Upload the result to storage
    // 6. Return the download URL

    console.log('Document generation request stored:', generatedDoc.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document generation initiated',
        documentId: generatedDoc.id,
        // For demo purposes, returning a placeholder
        downloadUrl: null,
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
