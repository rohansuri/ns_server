%% @author Couchbase <info@couchbase.com>
%% @copyright 2011-2015 Couchbase, Inc.
%%
%% Licensed under the Apache License, Version 2.0 (the "License");
%% you may not use this file except in compliance with the License.
%% You may obtain a copy of the License at
%%
%%      http://www.apache.org/licenses/LICENSE-2.0
%%
%% Unless required by applicable law or agreed to in writing, software
%% distributed under the License is distributed on an "AS IS" BASIS,
%% WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
%% See the License for the specific language governing permissions and
%% limitations under the License.

-module(ale_default_formatter).

%% API
-export([format_msg/2,
         format_time/1]).

-include("ale.hrl").

format_msg(#log_info{logger=Logger,
                     loglevel=LogLevel,
                     module=M, function=F, line=L,
                     time=Time,
                     pid=Pid, registered_name=RegName,
                     node=Node} = _Info, UserMsg) ->
    Process = case RegName of
                  undefined ->
                      erlang:pid_to_list(Pid);
                  _ ->
                      [atom_to_list(RegName), erlang:pid_to_list(Pid)]
              end,

    BaseHdr = io_lib:format("[~s:~s,", [Logger, LogLevel]),
    HdrWithTime = [BaseHdr | format_time(Time)],
    Header =
        [HdrWithTime | io_lib:format("~s:~s:~s:~s:~B]", [Node, Process, M, F, L])],
    [Header, UserMsg, "\n"].

%% Return formatted header with Time information
format_time(Time) ->
    LocalTime = calendar:now_to_local_time(Time),
    UTCTime = calendar:now_to_universal_time(Time),

    {{Year, Month, Day}, {Hour, Minute, Second}} = LocalTime,
    Millis = erlang:element(3, Time) div 1000,
    TimeHdr0 = io_lib:format("~B-~2.10.0B-~2.10.0BT~2.10.0B:~2.10.0B:~2.10.0B.~3.10.0B",
                             [Year, Month, Day, Hour, Minute, Second, Millis]),
    [TimeHdr0 | get_timezone_hdr(LocalTime, UTCTime)].


%% Format and return offset of local time zone w.r.t UTC
get_timezone_hdr(LocalTime, UTCTime) ->
    case ale_utils:get_timezone_offset(LocalTime, UTCTime) of
        utc ->
            "Z,";
        {Sign, DiffH, DiffM} ->
            io_lib:format("~s~2.10.0B:~2.10.0B,", [Sign, DiffH, DiffM])
    end.
