%extern{
#include "file_analysis/Manager.h"
#include "types.bif.h"
%}

refine flow RDP_Flow += {
	function proc_rdp_connect_request(cr: Connect_Request): bool
		%{
		if ( rdp_connect_request )
			{
			BifEvent::generate_rdp_connect_request(connection()->bro_analyzer(),
			                                       connection()->bro_analyzer()->Conn(),
			                                       bytestring_to_val(${cr.cookie_value}));
			}

		return true;
		%}

	function proc_rdp_negotiation_response(nr: RDP_Negotiation_Response): bool
		%{
		if ( rdp_negotiation_response )
			{
			BifEvent::generate_rdp_negotiation_response(connection()->bro_analyzer(),
			                                            connection()->bro_analyzer()->Conn(),
			                                            ${nr.selected_protocol});
			}

		return true;
		%}

	function proc_rdp_negotiation_failure(nf: RDP_Negotiation_Failure): bool
		%{
		if ( rdp_negotiation_failure )
			{
			BifEvent::generate_rdp_negotiation_failure(connection()->bro_analyzer(),
			                                           connection()->bro_analyzer()->Conn(),
			                                           ${nf.failure_code});
			}

		return true;
		%}


	function proc_rdp_gcc_server_create_response(gcc_response: GCC_Server_Create_Response): bool
		%{
		connection()->bro_analyzer()->ProtocolConfirmation();

		if ( rdp_gcc_server_create_response )
			BifEvent::generate_rdp_gcc_server_create_response(connection()->bro_analyzer(),
			                                                  connection()->bro_analyzer()->Conn(),
			                                                  ${gcc_response.result});

		return true;
		%}


	function proc_rdp_client_core_data(ccore: Client_Core_Data): bool
		%{
		connection()->bro_analyzer()->ProtocolConfirmation();

		if ( rdp_client_core_data )
			{
			RecordVal* ec_flags = new RecordVal(BifType::Record::RDP::EarlyCapabilityFlags);
			ec_flags->Assign(0, val_mgr->GetBool(${ccore.SUPPORT_ERRINFO_PDU}));
			ec_flags->Assign(1, val_mgr->GetBool(${ccore.WANT_32BPP_SESSION}));
			ec_flags->Assign(2, val_mgr->GetBool(${ccore.SUPPORT_STATUSINFO_PDU}));
			ec_flags->Assign(3, val_mgr->GetBool(${ccore.STRONG_ASYMMETRIC_KEYS}));
			ec_flags->Assign(4, val_mgr->GetBool(${ccore.SUPPORT_MONITOR_LAYOUT_PDU}));
			ec_flags->Assign(5, val_mgr->GetBool(${ccore.SUPPORT_NETCHAR_AUTODETECT}));
			ec_flags->Assign(6, val_mgr->GetBool(${ccore.SUPPORT_DYNVC_GFX_PROTOCOL}));
			ec_flags->Assign(7, val_mgr->GetBool(${ccore.SUPPORT_DYNAMIC_TIME_ZONE}));
			ec_flags->Assign(8, val_mgr->GetBool(${ccore.SUPPORT_HEARTBEAT_PDU}));

			RecordVal* ccd = new RecordVal(BifType::Record::RDP::ClientCoreData);
			ccd->Assign(0, val_mgr->GetCount(${ccore.version_major}));
			ccd->Assign(1, val_mgr->GetCount(${ccore.version_minor}));
			ccd->Assign(2, val_mgr->GetCount(${ccore.desktop_width}));
			ccd->Assign(3, val_mgr->GetCount(${ccore.desktop_height}));
			ccd->Assign(4, val_mgr->GetCount(${ccore.color_depth}));
			ccd->Assign(5, val_mgr->GetCount(${ccore.sas_sequence}));
			ccd->Assign(6, val_mgr->GetCount(${ccore.keyboard_layout}));
			ccd->Assign(7, val_mgr->GetCount(${ccore.client_build}));
			ccd->Assign(8, utf16_bytestring_to_utf8_val(connection()->bro_analyzer()->Conn(), ${ccore.client_name}));
			ccd->Assign(9, val_mgr->GetCount(${ccore.keyboard_type}));
			ccd->Assign(10, val_mgr->GetCount(${ccore.keyboard_sub}));
			ccd->Assign(11, val_mgr->GetCount(${ccore.keyboard_function_key}));
			ccd->Assign(12, utf16_bytestring_to_utf8_val(connection()->bro_analyzer()->Conn(), ${ccore.ime_file_name}));
			ccd->Assign(13, val_mgr->GetCount(${ccore.post_beta2_color_depth}));
			ccd->Assign(14, val_mgr->GetCount(${ccore.client_product_id}));
			ccd->Assign(15, val_mgr->GetCount(${ccore.serial_number}));
			ccd->Assign(16, val_mgr->GetCount(${ccore.high_color_depth}));
			ccd->Assign(17, val_mgr->GetCount(${ccore.supported_color_depths}));
			ccd->Assign(18, ec_flags);
			ccd->Assign(19, utf16_bytestring_to_utf8_val(connection()->bro_analyzer()->Conn(), ${ccore.dig_product_id}));

			BifEvent::generate_rdp_client_core_data(connection()->bro_analyzer(),
			                                        connection()->bro_analyzer()->Conn(),
			                                        ccd);
			}

		return true;
		%}

	function proc_rdp_server_security(ssd: Server_Security_Data): bool
		%{
		connection()->bro_analyzer()->ProtocolConfirmation();

		if ( rdp_server_security )
			BifEvent::generate_rdp_server_security(connection()->bro_analyzer(),
			                                       connection()->bro_analyzer()->Conn(),
			                                       ${ssd.encryption_method},
			                                       ${ssd.encryption_level});

		return true;
		%}

	function proc_rdp_server_certificate(cert: Server_Certificate): bool
		%{
		if ( rdp_server_certificate )
			{
			BifEvent::generate_rdp_server_certificate(connection()->bro_analyzer(),
			                                          connection()->bro_analyzer()->Conn(),
			                                          ${cert.cert_type},
			                                          ${cert.permanently_issued});
			}

		return true;
		%}

	function proc_x509_cert_data(x509: X509_Cert_Data): bool
		%{
		const bytestring& cert = ${x509.cert};

		ODesc file_handle;
		file_handle.AddRaw("Analyzer::ANALYZER_RDP");
		file_handle.Add(connection()->bro_analyzer()->Conn()->StartTime());
		connection()->bro_analyzer()->Conn()->IDString(&file_handle);
		string file_id = file_mgr->HashHandle(file_handle.Description());

		file_mgr->DataIn(reinterpret_cast<const u_char*>(cert.data()),
		                 cert.length(),
		                 connection()->bro_analyzer()->GetAnalyzerTag(),
		                 connection()->bro_analyzer()->Conn(),
		                 false, // It seems there are only server certs?
		                 file_id, "application/x-x509-user-cert");
		file_mgr->EndOfFile(file_id);

		return true;
		%}
};

refine typeattr Connect_Request += &let {
	proc: bool = $context.flow.proc_rdp_connect_request(this);
};

refine typeattr RDP_Negotiation_Response += &let {
	proc: bool = $context.flow.proc_rdp_negotiation_response(this);
};

refine typeattr RDP_Negotiation_Failure += &let {
	proc: bool = $context.flow.proc_rdp_negotiation_failure(this);
};

refine typeattr Client_Core_Data += &let {
	proc: bool = $context.flow.proc_rdp_client_core_data(this);
};

refine typeattr GCC_Server_Create_Response += &let {
	proc: bool = $context.flow.proc_rdp_gcc_server_create_response(this);
};

refine typeattr Server_Security_Data += &let {
	proc: bool = $context.flow.proc_rdp_server_security(this);
};

refine typeattr Server_Certificate += &let {
	proc: bool = $context.flow.proc_rdp_server_certificate(this);
};

refine typeattr X509_Cert_Data += &let {
	proc: bool = $context.flow.proc_x509_cert_data(this);
};
